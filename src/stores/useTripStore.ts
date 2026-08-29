import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Aportacion } from "../services/expenses/bote";
import { ACHIEVEMENT_DEFS } from "../data/achievements.data";
import { SEED_CHECKLIST } from "../data/checklist.data";
import { SEED_OPTIONAL_PLACES } from "../data/optionalPlaces.data";
import { CIUDADES_POR_DIA, PLAN_POR_CIUDADES } from "../data/reorganizacion.data";
import { createStop } from "../data/stopFactory";
import { fechaLocal } from "../utils/format";
import { createEmptyTrip, type NewTripInput } from "../data/tripFactory";
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
  ExpenseCategory,
  Favorite,
  FavoriteTargetType,
  ID,
  Note,
  Place,
  Refuel,
  RouteTemplate,
  Stop,
  Trip,
  TripDay,
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

/**
 * Todo lo que pertenece a un viaje concreto. El viaje **activo** vive suelto
 * en la raíz del store (`trip`, `stopsById`, `expenses`...) y los demás se
 * archivan aquí dentro de `savedTrips`.
 *
 * Se hizo así a propósito: mover el viaje activo a un diccionario habría
 * obligado a reescribir las decenas de acciones que ya existen, con el riesgo
 * que eso trae. De esta forma ninguna acción cambia, y cambiar de viaje es
 * simplemente archivar el actual y desempaquetar el otro.
 */
export interface TripWorkspace {
  trip: Trip;
  stopsById: Record<ID, Stop>;
  places: Place[];
  expenses: Expense[];
  /** Dinero adelantado al bote común. Ver services/expenses/bote. */
  aportaciones: Aportacion[];
  refuels: Refuel[];
  favorites: Favorite[];
  notes: Note[];
  checklist: ChecklistItem[];
  achievementsState: AchievementState[];
}

/** Ficha ligera para pintar la lista de viajes sin cargarlos enteros. */
export interface TripSummary {
  id: ID;
  name: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  stopCount: number;
  budgetEUR: number;
  isActive: boolean;
  /** Foto de portada del viaje, para la tarjeta de Mis viajes. */
  heroImage?: string;
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
  aportaciones: Aportacion[];
  refuels: Refuel[];
  favorites: Favorite[];
  notes: Note[];
  checklist: ChecklistItem[];
  achievementsState: AchievementState[];
  newlyUnlockedAchievementIds: string[];

  /** Viajes que no son el activo, archivados por id. */
  savedTrips: Record<ID, TripWorkspace>;

  history: { past: Snapshot[]; future: Snapshot[] };

  // --- Varios viajes ---
  listTrips: () => TripSummary[];
  switchTrip: (tripId: ID) => void;
  createTrip: (input: NewTripInput) => ID;
  createTripFromTemplate: (template: RouteTemplate, startDate: string) => ID;
  deleteTrip: (tripId: ID) => void;

  // --- Selectors auxiliares ---
  stopsOfDay: (dayId: ID) => Stop[];

  // --- Trip meta ---
  setTripMeta: (patch: Partial<Pick<Trip, "name" | "startDate" | "endDate" | "budgetEUR" | "travelers">>) => void;
  updateVehicle: (patch: Partial<Trip["vehicle"]>) => void;
  setEditLockMode: (mode: EditLockMode, pinHash?: string) => void;
  updateTripSettings: (patch: Partial<Trip["settings"]>) => void;
  setBudget: (totalEUR: number) => void;
  setMiViajero: (travelerId: ID | null) => void;
  setCategoryBudget: (category: ExpenseCategory, amountEUR: number | null) => void;
  setReturnTrip: (patch: Partial<Trip["returnTrip"]>) => void;
  recalculateDatesFromStart: (newStartDate: string) => void;

  // --- Repostajes ---
  addRefuel: (input: Omit<Refuel, "id" | "createdAt" | "updatedAt" | "totalCost">) => void;
  updateRefuel: (id: ID, patch: Partial<Refuel>) => void;
  deleteRefuel: (id: ID) => void;

  // --- Paradas ---
  updateStop: (id: ID, patch: Partial<Stop>) => void;
  addStop: (
    dayId: ID,
    input: {
      name: string;
      category: Stop["category"];
      coordinates: Stop["coordinates"];
      /** Opcionales: los trae una parada del catálogo, no una creada a mano. */
      shortDescription?: string;
      recommendedDurationMinutes?: number;
    },
  ) => ID;
  deleteStop: (id: ID) => void;
  duplicateStop: (id: ID) => void;
  reorderStopsInDay: (dayId: ID, orderedStopIds: ID[]) => void;
  moveStopToDay: (stopId: ID, targetDayId: ID, targetIndex: number) => void;
  setStopVisited: (id: ID, visited: boolean) => void;
  setCurrentDay: (dayId: ID) => void;
  sincronizarDiaDeHoy: () => void;
  setCurrentStop: (id: ID | null) => void;
  restoreOriginalRoute: () => void;

  // --- Días ---
  addDay: () => void;
  removeDay: (dayId: ID) => void;
  updateDay: (dayId: ID, patch: Partial<Pick<TripDay, "title" | "city" | "notes">>) => void;
  reorderDays: (orderedDayIds: ID[]) => void;

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
  addAportacion: (travelerId: ID, amountEUR: number, notes?: string) => void;
  deleteAportacion: (id: ID) => void;
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
    aportaciones: [] as Aportacion[],
    refuels: [] as Refuel[],
    favorites: [] as Favorite[],
    notes: [] as Note[],
    checklist: SEED_CHECKLIST,
    achievementsState: ACHIEVEMENT_DEFS.map((d) => ({ id: d.id, unlockedAt: null, progress: 0 })),
    savedTrips: {} as Record<ID, TripWorkspace>,
  };
}

/** Empaqueta el viaje activo para archivarlo al cambiar a otro. */
function packWorkspace(state: TripStoreState): TripWorkspace {
  return {
    trip: state.trip,
    stopsById: state.stopsById,
    places: state.places,
    expenses: state.expenses,
    aportaciones: state.aportaciones,
    refuels: state.refuels,
    favorites: state.favorites,
    notes: state.notes,
    checklist: state.checklist,
    achievementsState: state.achievementsState,
  };
}

/**
 * Portada del viaje: la parada activa con mejor valor fotográfico que tenga
 * imagen. Es el mismo criterio que usa el Resumen, así que la tarjeta y la
 * pantalla del viaje enseñan la misma foto y se reconocen entre sí.
 */
function portadaDe(workspace: TripWorkspace): string | undefined {
  const mejor = Object.values(workspace.stopsById)
    .filter((s) => s.heroImage && s.enabled)
    .sort((a, b) => b.photographyRating - a.photographyRating)[0];
  return mejor?.heroImage;
}

function summarise(workspace: TripWorkspace, isActive: boolean): TripSummary {
  return {
    id: workspace.trip.id,
    name: workspace.trip.name,
    startDate: workspace.trip.startDate,
    endDate: workspace.trip.endDate,
    dayCount: workspace.trip.days.length,
    stopCount: workspace.trip.days.reduce((total, day) => total + day.stopIds.length, 0),
    budgetEUR: workspace.trip.budgetEUR,
    isActive,
    heroImage: portadaDe(workspace),
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

      setBudget: (totalEUR) => set((state) => ({ trip: { ...state.trip, budgetEUR: Math.max(0, totalEUR) } })),

      setMiViajero: (travelerId) => set((state) => ({ trip: { ...state.trip, miViajeroId: travelerId ?? undefined } })),

      setCategoryBudget: (category, amountEUR) =>
        set((state) => {
          const actuales: Partial<Record<ExpenseCategory, number>> = { ...(state.trip.budgetByCategoryEUR ?? {}) };
          // null o cero significa "sin tope": se quita en vez de guardar un 0,
          // que se leería como "no puedes gastar nada aquí".
          if (amountEUR == null || amountEUR <= 0) delete actuales[category];
          else actuales[category] = amountEUR;
          return { trip: { ...state.trip, budgetByCategoryEUR: actuales } };
        }),

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
          shortDescription: input.shortDescription ?? "",
          fullDescription: input.shortDescription ?? "",
          ...(input.recommendedDurationMinutes != null
            ? { recommendedDurationMinutes: input.recommendedDurationMinutes }
            : {}),
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

      /*
       * Abrir la app en el día que toca.
       *
       * El día actual sólo cambiaba tocándolo a mano, así que el segundo día
       * del viaje la app seguía abriendo en el primero: el mapa, el diario y
       * los gastos nuevos iban al día equivocado hasta que te dabas cuenta.
       *
       * Sólo al abrir, y sólo si hoy es uno de los días del viaje. Durante el
       * día se puede mirar cualquier otro sin que la app te devuelva al de hoy
       * a media consulta.
       */
      sincronizarDiaDeHoy: () =>
        set((state) => {
          const dia = state.trip.days.find((d) => d.date === fechaLocal());
          if (!dia || state.trip.currentDayId === dia.id) return {};
          return { trip: { ...state.trip, currentDayId: dia.id, currentStopId: null } };
        }),
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
          /*
           * La fecha de fin se recalcula. `addDay` la movía al añadir pero
           * esto no la devolvía al quitar, así que un viaje al que le quitabas
           * el último día seguía diciendo que terminaba ese día: la cabecera,
           * el álbum y la búsqueda de hotel daban una fecha que ya no existía.
           */
          const endDate = days.length > 0 ? days[days.length - 1].date : state.trip.endDate;
          return { stopsById, trip: { ...state.trip, days, endDate, currentDayId: state.trip.currentDayId === dayId ? (days[0]?.id ?? null) : state.trip.currentDayId } };
        }),

      updateDay: (dayId, patch) =>
        set((state) => ({
          trip: { ...state.trip, days: state.trip.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) },
        })),

      /**
       * Reordena los días llevándose cada uno su itinerario entero.
       *
       * Las fechas NO viajan con el día: se quedan como huecos fijos en orden
       * ascendente. Mover el día 3 delante del 2 significa "esto lo hago un
       * día antes", no "cambio el calendario del viaje". Las paradas heredan
       * la fecha de su nuevo hueco, o quedarían fechadas en otro día.
       */
      reorderDays: (orderedDayIds) =>
        set((state) => {
          const porId = new Map(state.trip.days.map((d) => [d.id, d]));
          const reordenados = orderedDayIds.map((id) => porId.get(id)).filter((d): d is TripDay => d != null);
          if (reordenados.length !== state.trip.days.length) return state;

          const fechas = state.trip.days.map((d) => d.date);
          const stopsById = { ...state.stopsById };

          const days = reordenados.map((dia, posicion) => {
            const fecha = fechas[posicion];
            dia.stopIds.forEach((stopId) => {
              const parada = stopsById[stopId];
              if (parada) stopsById[stopId] = { ...parada, date: fecha };
            });
            return { ...dia, index: posicion, date: fecha };
          });

          return { stopsById, trip: { ...state.trip, days } };
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

      addAportacion: (travelerId, amountEUR, notes = "") =>
        set((state) => ({
          aportaciones: [
            ...state.aportaciones,
            {
              id: generateId("aportacion"),
              travelerId,
              amountEUR: Math.abs(amountEUR),
              date: fechaLocal(),
              notes,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      deleteAportacion: (id) => set((state) => ({ aportaciones: state.aportaciones.filter((a) => a.id !== id) })),

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

      // --- Varios viajes ---------------------------------------------------

      listTrips: () => {
        const state = get();
        const activo = summarise(packWorkspace(state), true);
        const archivados = Object.values(state.savedTrips).map((w) => summarise(w, false));
        // Más recientes primero por fecha de inicio, con el activo siempre arriba.
        archivados.sort((a, b) => b.startDate.localeCompare(a.startDate));
        return [activo, ...archivados];
      },

      switchTrip: (tripId) =>
        set((state) => {
          if (tripId === state.trip.id) return {};
          const destino = state.savedTrips[tripId];
          if (!destino) return {};

          // El actual se archiva y el destino sale del archivo: nunca hay dos
          // copias del mismo viaje, ni se pierde lo que estuviera sin guardar.
          const savedTrips = { ...state.savedTrips, [state.trip.id]: packWorkspace(state) };
          delete savedTrips[tripId];

          return {
            ...destino,
            savedTrips,
            // El historial de deshacer es del viaje que dejamos atrás.
            history: { past: [], future: [] },
            newlyUnlockedAchievementIds: [],
          };
        }),

      createTrip: (input) => {
        const nuevo = createEmptyTrip(input);
        set((state) => ({
          savedTrips: { ...state.savedTrips, [state.trip.id]: packWorkspace(state) },
          trip: nuevo,
          stopsById: {},
          places: [],
          expenses: [],
          refuels: [],
          favorites: [],
          notes: [],
          checklist: SEED_CHECKLIST.map((item) => ({ ...item, checked: false })),
          achievementsState: ACHIEVEMENT_DEFS.map((d) => ({ id: d.id, unlockedAt: null, progress: 0 })),
          history: { past: [], future: [] },
          newlyUnlockedAchievementIds: [],
        }));
        return nuevo.id;
      },

      createTripFromTemplate: (template, startDate) => {
        const nuevoId = get().createTrip({ name: template.name, startDate, dayCount: template.dayCount });
        const dias = get().trip.days;

        // Las paradas de la plantilla se materializan como paradas propias del
        // viaje nuevo, con ids nuevos: la ruta del catálogo nunca se toca, y
        // editar la copia no afecta a nadie más.
        const paradas: Stop[] = [];
        const porDia = new Map<ID, ID[]>();

        for (const dia of dias) {
          const delDia = template.stops.filter((s) => s.dayIndex === dia.index);
          const ids: ID[] = [];
          delDia.forEach((plantilla, orden) => {
            const parada = createStop({
              id: generateId("stop"),
              dayId: dia.id,
              order: orden,
              name: plantilla.name,
              category: plantilla.category,
              coordinates: plantilla.coordinates,
              date: dia.date,
              shortDescription: plantilla.shortDescription,
              fullDescription: plantilla.shortDescription,
              recommendedDurationMinutes: plantilla.recommendedDurationMinutes,
            });
            paradas.push(parada);
            ids.push(parada.id);
          });
          porDia.set(dia.id, ids);
        }

        set((state) => ({
          stopsById: stopsToRecord(paradas),
          trip: recomputeOverloaded({
            ...state.trip,
            days: state.trip.days.map((d) => ({ ...d, stopIds: porDia.get(d.id) ?? [] })),
          }),
        }));

        return nuevoId;
      },

      deleteTrip: (tripId) =>
        set((state) => {
          // Borrar el viaje activo exige tener otro al que saltar: la app
          // siempre trabaja sobre un viaje, nunca sobre ninguno.
          if (tripId !== state.trip.id) {
            const savedTrips = { ...state.savedTrips };
            delete savedTrips[tripId];
            return { savedTrips };
          }

          const [siguienteId] = Object.keys(state.savedTrips);
          if (!siguienteId) return {};

          const siguiente = state.savedTrips[siguienteId];
          const savedTrips = { ...state.savedTrips };
          delete savedTrips[siguienteId];

          return {
            ...siguiente,
            savedTrips,
            history: { past: [], future: [] },
            newlyUnlockedAchievementIds: [],
          };
        }),
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
      version: 6,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<TripStoreState> | undefined;
        if (!state) return persisted as TripStoreState;

        /*
         * v4 → v6: reorganización del viaje por ciudades. Se subió a 6 al añadir la
         * pensión de la última noche: la 5 ya se había desplegado y no habría
         * vuelto a ejecutarse en un móvil que ya la hubiera aplicado.
         *
         * Solo toca las paradas que reconoce del plan. Las que hayas creado tú
         * se quedan en su día, al final; su contenido —nombre, fotos, notas,
         * visitada— no se toca en ningún caso, solo cambian de día y fecha.
         */
        const reorganizarPorCiudades = (s: Partial<TripStoreState>): Partial<TripStoreState> => {
          if (!s.trip || !s.stopsById) return s;
          // Es el viaje de Euskadi: no reorganizamos viajes ajenos al plan.
          if (s.trip.id !== SEED_TRIP.id) return s;

          const dias = s.trip.days;
          if (dias.length < 5) return s;

          const stopsById = { ...s.stopsById };
          const planificadas = new Map<number, { id: ID; orden: number }[]>();
          const conocidas = new Set<string>();

          const semillaPorId = new Map(SEED_STOPS.map((p) => [p.id, p]));

          for (const [stopId, destino] of Object.entries(PLAN_POR_CIUDADES)) {
            if (!stopsById[stopId]) {
              // Parada del plan que aún no tienes: se crea desde la semilla.
              // Así una parada nueva (la pensión de la última noche) llega a
              // quien ya tenía el viaje guardado, sin tocar nada más.
              const desdeSemilla = semillaPorId.get(stopId);
              if (!desdeSemilla) continue;
              stopsById[stopId] = { ...desdeSemilla };
            }
            conocidas.add(stopId);
            const lista = planificadas.get(destino.dia) ?? [];
            lista.push({ id: stopId, orden: destino.orden });
            planificadas.set(destino.dia, lista);
          }
          if (conocidas.size === 0) return s;

          const days = dias.map((dia, posicion) => {
            const numero = posicion + 1;
            const delPlan = (planificadas.get(numero) ?? []).sort((a, b) => a.orden - b.orden).map((p) => p.id);
            // Lo que ya estaba en este día y el plan no menciona: paradas
            // tuyas. Se conservan, detrás de las planificadas.
            const propias = dia.stopIds.filter((id) => !conocidas.has(id));
            const stopIds = [...delPlan, ...propias];

            stopIds.forEach((id, orden) => {
              const parada = stopsById[id];
              if (parada) stopsById[id] = { ...parada, dayId: dia.id, date: dia.date, order: orden };
            });

            const etiquetas = CIUDADES_POR_DIA[numero];
            return { ...dia, stopIds, ...(etiquetas ?? {}) };
          });

          return { ...s, stopsById, trip: recomputeOverloaded({ ...s.trip, days }) };
        };

        /*
         * v3 → v4: la categoría "ciudad". Girona, Pamplona y Bilbao estaban
         * guardadas como "pueblo" y cambiar la semilla no toca lo que ya está
         * en el dispositivo, así que se reclasifican aquí por id. Solo se
         * corrige lo que siga tal cual salió de la semilla: si tú cambiaste la
         * categoría a mano, se respeta.
         */
        const conCategorias = (s: Partial<TripStoreState>): Partial<TripStoreState> => {
          const semilla = new Map(SEED_STOPS.filter((p) => p.category === "ciudad").map((p) => [p.id, p.category]));
          if (semilla.size === 0 || !s.stopsById) return s;
          const stopsById = { ...s.stopsById };
          for (const [id, parada] of Object.entries(stopsById)) {
            if (parada.category === "pueblo" && semilla.has(id)) stopsById[id] = { ...parada, category: "ciudad" };
          }
          return { ...s, stopsById };
        };

        /*
         * v2 → v3: soporte de varios viajes. Lo que había guardado pasa a ser
         * el viaje activo tal cual, y solo se añade el archivo vacío. No se
         * mueve ni un dato: el viaje, los gastos, el diario y las fotos
         * siguen exactamente donde estaban.
         */
        if (fromVersion >= 2) return reorganizarPorCiudades(conCategorias({ ...state, savedTrips: state.savedTrips ?? {} })) as TripStoreState;

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

        // Quien venga de v1 llega también a v3: un solo viaje, archivo vacío.
        return reorganizarPorCiudades(conCategorias({ ...state, stopsById, places, savedTrips: state.savedTrips ?? {} })) as TripStoreState;
      },
      partialize: (state) => ({
        trip: state.trip,
        stopsById: state.stopsById,
        places: state.places,
        expenses: state.expenses,
        // Sin esto el bote se vaciaba al recargar: el estado existía en memoria
        // pero nunca se escribía. Todo lo que el usuario escribe tiene que
        // estar en esta lista, o desaparece al cerrar la app.
        aportaciones: state.aportaciones,
        refuels: state.refuels,
        favorites: state.favorites,
        notes: state.notes,
        checklist: state.checklist,
        achievementsState: state.achievementsState,
        // Sin esto los demás viajes desaparecerían al recargar la app.
        savedTrips: state.savedTrips,
      }),
    },
  ),
);
