import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ACHIEVEMENT_DEFS } from "../data/achievements.data";
import { SEED_CHECKLIST } from "../data/checklist.data";
import { SEED_OPTIONAL_PLACES } from "../data/optionalPlaces.data";
import { createStop } from "../data/stopFactory";
import { SEED_STOPS } from "../data/stops.data";
import { SEED_TRIP } from "../data/trip.data";
import { AchievementService } from "../services/achievements/AchievementService";
import { createZustandStorageAdapter } from "../services/storage/StorageService";
import type {
  AchievementState,
  ChecklistCategory,
  ChecklistItem,
  EditLockMode,
  Expense,
  Favorite,
  FavoriteTargetType,
  ID,
  Note,
  Place,
  Refuel,
  Stop,
  Trip,
} from "../types";
import { shiftISODate, daysBetween } from "../utils/dates";
import { generateId } from "../utils/id";

interface Snapshot {
  label: string;
  createdAt: string;
  trip: Trip;
  stopsById: Record<ID, Stop>;
  places: Place[];
}

const MAX_HISTORY = 20;

function stopsToRecord(stops: Stop[]): Record<ID, Stop> {
  return Object.fromEntries(stops.map((s) => [s.id, s]));
}

function recomputeOverloaded(trip: Trip): Trip {
  return { ...trip, days: trip.days.map((d) => ({ ...d, isOverloaded: d.stopIds.length > 6 })) };
}

interface TripStoreState {
  trip: Trip;
  stopsById: Record<ID, Stop>;
  places: Place[];
  expenses: Expense[];
  refuels: Refuel[];
  favorites: Favorite[];
  notes: Note[];
  checklist: ChecklistItem[];
  achievementsState: AchievementState[];
  newlyUnlockedAchievementIds: string[];

  history: { past: Snapshot[]; future: Snapshot[] };

  // --- Selectors auxiliares ---
  stopsOfDay: (dayId: ID) => Stop[];

  // --- Trip meta ---
  setTripMeta: (patch: Partial<Pick<Trip, "name" | "startDate" | "endDate" | "budgetEUR" | "travelers">>) => void;
  updateVehicle: (patch: Partial<Trip["vehicle"]>) => void;
  setEditLockMode: (mode: EditLockMode, pinHash?: string) => void;
  updateTripSettings: (patch: Partial<Trip["settings"]>) => void;
  setReturnTrip: (patch: Partial<Trip["returnTrip"]>) => void;
  recalculateDatesFromStart: (newStartDate: string) => void;

  // --- Repostajes ---
  addRefuel: (input: Omit<Refuel, "id" | "createdAt" | "updatedAt" | "totalCost">) => void;
  updateRefuel: (id: ID, patch: Partial<Refuel>) => void;
  deleteRefuel: (id: ID) => void;

  // --- Paradas ---
  updateStop: (id: ID, patch: Partial<Stop>) => void;
  addStop: (dayId: ID, input: { name: string; category: Stop["category"]; coordinates: Stop["coordinates"] }) => ID;
  deleteStop: (id: ID) => void;
  duplicateStop: (id: ID) => void;
  reorderStopsInDay: (dayId: ID, orderedStopIds: ID[]) => void;
  moveStopToDay: (stopId: ID, targetDayId: ID, targetIndex: number) => void;
  setStopVisited: (id: ID, visited: boolean) => void;
  setCurrentDay: (dayId: ID) => void;
  setCurrentStop: (id: ID | null) => void;
  restoreOriginalRoute: () => void;

  // --- Días ---
  addDay: () => void;
  removeDay: (dayId: ID) => void;

  // --- Lugares opcionales ---
  addPlaceToRoute: (placeId: ID, dayId: ID) => void;
  toggleSaveForLater: (placeId: ID) => void;
  addCustomPlace: (input: Omit<Place, "id" | "createdAt" | "updatedAt" | "savedForLater" | "addedToRoute" | "source">) => void;

  // --- Favoritos ---
  toggleFavorite: (targetType: FavoriteTargetType, targetId: ID) => void;
  isFavorite: (targetType: FavoriteTargetType, targetId: ID) => boolean;

  // --- Notas ---
  addNote: (input: Omit<Note, "id" | "date">) => void;
  updateNote: (id: ID, patch: Partial<Note>) => void;
  deleteNote: (id: ID) => void;

  // --- Gastos ---
  addExpense: (input: Omit<Expense, "id" | "createdAt" | "updatedAt">) => void;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  deleteExpense: (id: ID) => void;

  // --- Checklist ---
  toggleChecklistItem: (id: ID) => void;
  addChecklistItem: (category: ChecklistCategory, label: string) => void;
  removeChecklistItem: (id: ID) => void;
  restoreChecklistDefaults: () => void;

  // --- Logros ---
  syncAchievements: (totalPhotos: number) => void;
  clearNewlyUnlocked: () => void;

  // --- Historial / deshacer-rehacer ---
  pushSnapshot: (label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // --- Import / reset ---
  importTripData: (data: { trip: Trip; stops: Stop[]; expenses: Expense[]; refuels: Refuel[]; favorites: Favorite[]; notes: Note[]; checklist: ChecklistItem[]; achievementsState: AchievementState[] }) => void;
  resetAllData: () => void;
}

function initialState() {
  return {
    trip: SEED_TRIP,
    stopsById: stopsToRecord(SEED_STOPS),
    places: SEED_OPTIONAL_PLACES,
    expenses: [] as Expense[],
    refuels: [] as Refuel[],
    favorites: [] as Favorite[],
    notes: [] as Note[],
    checklist: SEED_CHECKLIST,
    achievementsState: ACHIEVEMENT_DEFS.map((d) => ({ id: d.id, unlockedAt: null, progress: 0 })),
  };
}

export const useTripStore = create<TripStoreState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      newlyUnlockedAchievementIds: [],
      history: { past: [], future: [] },

      stopsOfDay: (dayId) => {
        const state = get();
        const day = state.trip.days.find((d) => d.id === dayId);
        if (!day) return [];
        return day.stopIds.map((id) => state.stopsById[id]).filter((s): s is Stop => Boolean(s));
      },

      setTripMeta: (patch) => set((state) => ({ trip: { ...state.trip, ...patch, updatedAt: new Date().toISOString() } })),

      updateVehicle: (patch) =>
        set((state) => ({ trip: { ...state.trip, vehicle: { ...state.trip.vehicle, ...patch, updatedAt: new Date().toISOString() } } })),

      setEditLockMode: (mode, pinHash) =>
        set((state) => ({ trip: { ...state.trip, settings: { ...state.trip.settings, editLockMode: mode, pinHash: pinHash ?? state.trip.settings.pinHash } } })),

      setReturnTrip: (patch) => set((state) => ({ trip: { ...state.trip, returnTrip: { ...state.trip.returnTrip, ...patch } } })),

      updateTripSettings: (patch) => set((state) => ({ trip: { ...state.trip, settings: { ...state.trip.settings, ...patch } } })),

      recalculateDatesFromStart: (newStartDate) =>
        set((state) => {
          const delta = daysBetween(state.trip.startDate, newStartDate);
          if (delta === 0) return state;

          const days = state.trip.days.map((d) => ({ ...d, date: shiftISODate(d.date, delta) }));
          const stopsById = Object.fromEntries(Object.entries(state.stopsById).map(([id, stop]) => [id, { ...stop, date: shiftISODate(stop.date, delta) }]));

          return {
            stopsById,
            trip: { ...state.trip, startDate: newStartDate, endDate: shiftISODate(state.trip.endDate, delta), days, updatedAt: new Date().toISOString() },
          };
        }),

      addRefuel: (input) =>
        set((state) => {
          const now = new Date().toISOString();
          const refuel: Refuel = { ...input, id: generateId("refuel"), totalCost: input.liters * input.pricePerLiter, createdAt: now, updatedAt: now };
          return { refuels: [...state.refuels, refuel] };
        }),
      updateRefuel: (id, patch) =>
        set((state) => ({
          refuels: state.refuels.map((r) => (r.id === id ? { ...r, ...patch, totalCost: (patch.liters ?? r.liters) * (patch.pricePerLiter ?? r.pricePerLiter), updatedAt: new Date().toISOString() } : r)),
        })),
      deleteRefuel: (id) => set((state) => ({ refuels: state.refuels.filter((r) => r.id !== id) })),

      updateStop: (id, patch) =>
        set((state) => {
          const existing = state.stopsById[id];
          if (!existing) return state;
          return { stopsById: { ...state.stopsById, [id]: { ...existing, ...patch, updatedAt: new Date().toISOString() } } };
        }),

      addStop: (dayId, input) => {
        const state = get();
        const day = state.trip.days.find((d) => d.id === dayId);
        if (!day) return "";

        const id = generateId("stop");
        const newStop = createStop({
          id,
          dayId,
          order: day.stopIds.length,
          name: input.name,
          category: input.category,
          coordinates: input.coordinates,
          date: day.date,
          shortDescription: "",
          fullDescription: "",
        });

        set((s) => {
          const stopIds = [...day.stopIds, id];
          const trip = recomputeOverloaded({ ...s.trip, days: s.trip.days.map((d) => (d.id === dayId ? { ...d, stopIds } : d)) });
          return { stopsById: { ...s.stopsById, [id]: newStop }, trip };
        });

        return id;
      },

      deleteStop: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.stopsById;
          const trip = recomputeOverloaded({
            ...state.trip,
            days: state.trip.days.map((d) => (d.stopIds.includes(id) ? { ...d, stopIds: d.stopIds.filter((sid) => sid !== id) } : d)),
            currentStopId: state.trip.currentStopId === id ? null : state.trip.currentStopId,
          });
          return { stopsById: rest, trip };
        }),

      duplicateStop: (id) =>
        set((state) => {
          const original = state.stopsById[id];
          if (!original) return state;
          const newId = generateId("stop");
          const copy: Stop = { ...original, id: newId, name: `${original.name} (copia)`, visited: false, visitStatus: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          const trip = recomputeOverloaded({
            ...state.trip,
            days: state.trip.days.map((d) => (d.id === original.dayId ? { ...d, stopIds: [...d.stopIds, newId] } : d)),
          });
          return { stopsById: { ...state.stopsById, [newId]: copy }, trip };
        }),

      reorderStopsInDay: (dayId, orderedStopIds) =>
        set((state) => {
          const stopsById = { ...state.stopsById };
          orderedStopIds.forEach((id, index) => {
            if (stopsById[id]) stopsById[id] = { ...stopsById[id], order: index };
          });
          return {
            stopsById,
            trip: { ...state.trip, days: state.trip.days.map((d) => (d.id === dayId ? { ...d, stopIds: orderedStopIds } : d)) },
          };
        }),

      moveStopToDay: (stopId, targetDayId, targetIndex) =>
        set((state) => {
          const stop = state.stopsById[stopId];
          if (!stop) return state;
          const targetDay = state.trip.days.find((d) => d.id === targetDayId);
          if (!targetDay) return state;

          const days = state.trip.days.map((d) => {
            if (d.id === stop.dayId && d.id !== targetDayId) return { ...d, stopIds: d.stopIds.filter((id) => id !== stopId) };
            if (d.id === targetDayId) {
              const withoutStop = d.stopIds.filter((id) => id !== stopId);
              const nextIds = [...withoutStop.slice(0, targetIndex), stopId, ...withoutStop.slice(targetIndex)];
              return { ...d, stopIds: nextIds };
            }
            return d;
          });

          return {
            stopsById: { ...state.stopsById, [stopId]: { ...stop, dayId: targetDayId, date: targetDay.date, updatedAt: new Date().toISOString() } },
            trip: recomputeOverloaded({ ...state.trip, days }),
          };
        }),

      setStopVisited: (id, visited) =>
        set((state) => {
          const existing = state.stopsById[id];
          if (!existing) return state;
          return {
            stopsById: {
              ...state.stopsById,
              [id]: { ...existing, visited, visitStatus: visited ? "completed" : "pending", visitedAt: visited ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() },
            },
          };
        }),

      setCurrentDay: (dayId) => set((state) => ({ trip: { ...state.trip, currentDayId: dayId, currentStopId: null } })),
      setCurrentStop: (id) => set((state) => ({ trip: { ...state.trip, currentStopId: id } })),

      restoreOriginalRoute: () => {
        get().pushSnapshot("Antes de restaurar la ruta original");
        set(() => ({ ...initialState() }));
      },

      addDay: () =>
        set((state) => {
          const lastDay = state.trip.days[state.trip.days.length - 1];
          const newDay = { id: generateId("day"), index: state.trip.days.length, date: shiftISODate(lastDay.date, 1), title: "Nuevo día", stopIds: [], isOverloaded: false, rainModeActive: false, notes: "" };
          return { trip: { ...state.trip, days: [...state.trip.days, newDay], endDate: newDay.date } };
        }),

      removeDay: (dayId) =>
        set((state) => {
          const day = state.trip.days.find((d) => d.id === dayId);
          if (!day) return state;
          const stopsById = { ...state.stopsById };
          day.stopIds.forEach((id) => delete stopsById[id]);
          const days = state.trip.days.filter((d) => d.id !== dayId).map((d, index) => ({ ...d, index }));
          return { stopsById, trip: { ...state.trip, days, currentDayId: state.trip.currentDayId === dayId ? (days[0]?.id ?? null) : state.trip.currentDayId } };
        }),

      addPlaceToRoute: (placeId, dayId) => {
        const state = get();
        const place = state.places.find((p) => p.id === placeId);
        const day = state.trip.days.find((d) => d.id === dayId);
        if (!place || !day) return;

        const id = generateId("stop");
        const newStop = createStop({
          id,
          dayId,
          order: day.stopIds.length,
          name: place.name,
          category: place.category,
          coordinates: place.coordinates,
          date: day.date,
          shortDescription: place.shortDescription,
          fullDescription: place.shortDescription,
          photographyRating: place.photographyRating,
          optional: true,
          tags: place.tags,
          heroImage: place.heroImage,
          source: place.source,
        });

        set((s) => ({
          stopsById: { ...s.stopsById, [id]: newStop },
          trip: recomputeOverloaded({ ...s.trip, days: s.trip.days.map((d) => (d.id === dayId ? { ...d, stopIds: [...d.stopIds, id] } : d)) }),
          places: s.places.map((p) => (p.id === placeId ? { ...p, addedToRoute: true } : p)),
        }));
      },

      toggleSaveForLater: (placeId) => set((state) => ({ places: state.places.map((p) => (p.id === placeId ? { ...p, savedForLater: !p.savedForLater } : p)) })),

      addCustomPlace: (input) =>
        set((state) => {
          const now = new Date().toISOString();
          const place: Place = { ...input, id: generateId("place"), createdAt: now, updatedAt: now, savedForLater: false, addedToRoute: false, source: "user" };
          return { places: [...state.places, place] };
        }),

      toggleFavorite: (targetType, targetId) =>
        set((state) => {
          const existing = state.favorites.find((f) => f.targetType === targetType && f.targetId === targetId);
          if (existing) return { favorites: state.favorites.filter((f) => f.id !== existing.id) };
          return { favorites: [...state.favorites, { id: generateId("favorite"), targetType, targetId, addedAt: new Date().toISOString() }] };
        }),

      isFavorite: (targetType, targetId) => get().favorites.some((f) => f.targetType === targetType && f.targetId === targetId),

      addNote: (input) => set((state) => ({ notes: [...state.notes, { ...input, id: generateId("note"), date: new Date().toISOString() }] })),
      updateNote: (id, patch) => set((state) => ({ notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

      addExpense: (input) =>
        set((state) => {
          const now = new Date().toISOString();
          return { expenses: [...state.expenses, { ...input, id: generateId("expense"), createdAt: now, updatedAt: now }] };
        }),
      updateExpense: (id, patch) => set((state) => ({ expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)) })),
      deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

      toggleChecklistItem: (id) => set((state) => ({ checklist: state.checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)) })),
      addChecklistItem: (category, label) => set((state) => ({ checklist: [...state.checklist, { id: generateId("checklist"), category, label, checked: false, isCustom: true }] })),
      removeChecklistItem: (id) => set((state) => ({ checklist: state.checklist.filter((c) => c.id !== id) })),
      restoreChecklistDefaults: () => set({ checklist: SEED_CHECKLIST }),

      syncAchievements: (totalPhotos) =>
        set((state) => {
          const ctx = {
            trip: state.trip,
            stops: Object.values(state.stopsById),
            totalPhotos,
            totalKm: state.trip.vehicle.odometerEndKm != null ? state.trip.vehicle.odometerEndKm - state.trip.vehicle.odometerStartKm : state.refuels.reduce((max, r) => Math.max(max, r.odometerKm - state.trip.vehicle.odometerStartKm), 0),
            totalDistinctStadiumsVisited: new Set(Object.values(state.stopsById).filter((s) => s.category === "estadio" && s.visited).map((s) => s.id)).size,
            totalRefuels: state.refuels.length,
          };
          const nextState = AchievementService.evaluate(ctx, state.achievementsState);
          const newlyUnlocked = AchievementService.newlyUnlockedIds(state.achievementsState, nextState);
          return { achievementsState: nextState, newlyUnlockedAchievementIds: [...state.newlyUnlockedAchievementIds, ...newlyUnlocked] };
        }),

      clearNewlyUnlocked: () => set({ newlyUnlockedAchievementIds: [] }),

      pushSnapshot: (label) =>
        set((state) => {
          const snapshot: Snapshot = { label, createdAt: new Date().toISOString(), trip: state.trip, stopsById: state.stopsById, places: state.places };
          const past = [...state.history.past, snapshot].slice(-MAX_HISTORY);
          return { history: { past, future: [] } };
        }),

      undo: () =>
        set((state) => {
          const previous = state.history.past[state.history.past.length - 1];
          if (!previous) return state;
          const currentSnapshot: Snapshot = { label: "estado actual", createdAt: new Date().toISOString(), trip: state.trip, stopsById: state.stopsById, places: state.places };
          return {
            trip: previous.trip,
            stopsById: previous.stopsById,
            places: previous.places,
            history: { past: state.history.past.slice(0, -1), future: [currentSnapshot, ...state.history.future] },
          };
        }),

      redo: () =>
        set((state) => {
          const next = state.history.future[0];
          if (!next) return state;
          const currentSnapshot: Snapshot = { label: "estado actual", createdAt: new Date().toISOString(), trip: state.trip, stopsById: state.stopsById, places: state.places };
          return {
            trip: next.trip,
            stopsById: next.stopsById,
            places: next.places,
            history: { past: [...state.history.past, currentSnapshot], future: state.history.future.slice(1) },
          };
        }),

      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,

      importTripData: (data) =>
        set(() => ({
          trip: data.trip,
          stopsById: stopsToRecord(data.stops),
          expenses: data.expenses,
          refuels: data.refuels,
          favorites: data.favorites,
          notes: data.notes,
          checklist: data.checklist,
          achievementsState: data.achievementsState,
        })),

      resetAllData: () => set(() => ({ ...initialState(), history: { past: [], future: [] }, newlyUnlockedAchievementIds: [] })),
    }),
    {
      name: "trip",
      storage: createJSONStorage(() => createZustandStorageAdapter("trip")),
      /*
       * Versión del estado persistido. Al subirla, `migrate` reconcilia los
       * datos guardados en el dispositivo con la semilla actual. Sin esto,
       * cualquier campo nuevo añadido a los datos (p. ej. las fotos reales
       * `heroImage`) no aparecería nunca para quien ya tuviera el viaje
       * guardado en localStorage, que es justo lo que pasaba.
       */
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<TripStoreState> | undefined;
        if (!state) return persisted as TripStoreState;
        if (fromVersion >= 2) return state as TripStoreState;

        // v1 → v2: incorporar `heroImage` (y nuevos lugares opcionales) sin
        // tocar nada de lo que el usuario haya editado.
        const seedStopImages = new Map(SEED_STOPS.map((s) => [s.id, s.heroImage]));
        const stopsById = { ...(state.stopsById ?? {}) };
        for (const [id, stop] of Object.entries(stopsById)) {
          const seedImage = seedStopImages.get(id);
          if (seedImage && !stop.heroImage) stopsById[id] = { ...stop, heroImage: seedImage };
        }

        const existingPlaces = state.places ?? [];
        const byId = new Map(existingPlaces.map((p) => [p.id, p]));
        const places = SEED_OPTIONAL_PLACES.map((seed) => {
          const existing = byId.get(seed.id);
          if (!existing) return seed;
          return { ...existing, heroImage: existing.heroImage ?? seed.heroImage };
        });
        // Conservar lugares personalizados que el usuario haya creado.
        for (const p of existingPlaces) if (!places.some((sp) => sp.id === p.id)) places.push(p);

        return { ...state, stopsById, places } as TripStoreState;
      },
      partialize: (state) => ({
        trip: state.trip,
        stopsById: state.stopsById,
        places: state.places,
        expenses: state.expenses,
        refuels: state.refuels,
        favorites: state.favorites,
        notes: state.notes,
        checklist: state.checklist,
        achievementsState: state.achievementsState,
      }),
    },
  ),
);
