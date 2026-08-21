import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";

const NUEVO = { name: "Costa Brava", startDate: "2027-06-01", dayCount: 3, budgetEUR: 400 };

beforeEach(() => {
  useTripStore.getState().resetAllData();
});

describe("listTrips", () => {
  it("starts with only the seeded trip, marked active", () => {
    const trips = useTripStore.getState().listTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].isActive).toBe(true);
    expect(trips[0].id).toBe(useTripStore.getState().trip.id);
  });

  it("puts the active trip first and summarises days and stops", () => {
    const original = useTripStore.getState().trip;
    const paradasOriginales = original.days.reduce((t, d) => t + d.stopIds.length, 0);

    useTripStore.getState().createTrip(NUEVO);
    const trips = useTripStore.getState().listTrips();

    expect(trips).toHaveLength(2);
    expect(trips[0].name).toBe("Costa Brava");
    expect(trips[0].isActive).toBe(true);

    const archivado = trips.find((t) => t.id === original.id);
    expect(archivado?.isActive).toBe(false);
    expect(archivado?.stopCount).toBe(paradasOriginales);
  });
});

describe("createTrip", () => {
  it("activates the new trip with its own empty data", () => {
    useTripStore.getState().createTrip(NUEVO);
    const state = useTripStore.getState();

    expect(state.trip.name).toBe("Costa Brava");
    expect(state.trip.days).toHaveLength(3);
    expect(state.expenses).toEqual([]);
    expect(Object.keys(state.stopsById)).toHaveLength(0);
  });

  it("does not leak the previous trip's expenses into the new one", () => {
    useTripStore.getState().addExpense({
      date: "2026-08-29",
      time: "14:00",
      amountEUR: 25,
      category: "gastronomia" as never,
      place: "Huesca",
      dayId: "day-1",
      stopId: null,
      travelerId: null,
      note: "",
    } as never);
    expect(useTripStore.getState().expenses).toHaveLength(1);

    useTripStore.getState().createTrip(NUEVO);
    expect(useTripStore.getState().expenses).toHaveLength(0);
  });
});

describe("switchTrip", () => {
  it("restores each trip's own data when moving back and forth", () => {
    const originalId = useTripStore.getState().trip.id;
    useTripStore.getState().addExpense({
      date: "2026-08-29",
      time: "14:00",
      amountEUR: 25,
      category: "gastronomia" as never,
      place: "Huesca",
      dayId: "day-1",
      stopId: null,
      travelerId: null,
      note: "",
    } as never);

    const nuevoId = useTripStore.getState().createTrip(NUEVO);
    expect(useTripStore.getState().expenses).toHaveLength(0);

    useTripStore.getState().switchTrip(originalId);
    expect(useTripStore.getState().trip.id).toBe(originalId);
    expect(useTripStore.getState().expenses).toHaveLength(1);

    useTripStore.getState().switchTrip(nuevoId);
    expect(useTripStore.getState().trip.name).toBe("Costa Brava");
    expect(useTripStore.getState().expenses).toHaveLength(0);
  });

  it("never keeps two copies of the same trip", () => {
    const originalId = useTripStore.getState().trip.id;
    useTripStore.getState().createTrip(NUEVO);
    useTripStore.getState().switchTrip(originalId);

    const state = useTripStore.getState();
    expect(state.savedTrips[originalId]).toBeUndefined();
    expect(state.listTrips().filter((t) => t.id === originalId)).toHaveLength(1);
  });

  it("ignores an unknown id and switching to the active trip", () => {
    const antes = useTripStore.getState().trip.id;
    useTripStore.getState().switchTrip("no-existe");
    expect(useTripStore.getState().trip.id).toBe(antes);

    useTripStore.getState().switchTrip(antes);
    expect(useTripStore.getState().trip.id).toBe(antes);
  });
});

describe("deleteTrip", () => {
  it("removes an archived trip without touching the active one", () => {
    const originalId = useTripStore.getState().trip.id;
    useTripStore.getState().createTrip(NUEVO);

    useTripStore.getState().deleteTrip(originalId);

    expect(useTripStore.getState().trip.name).toBe("Costa Brava");
    expect(useTripStore.getState().listTrips()).toHaveLength(1);
  });

  it("falls back to another trip when the active one is deleted", () => {
    const originalId = useTripStore.getState().trip.id;
    const nuevoId = useTripStore.getState().createTrip(NUEVO);

    useTripStore.getState().deleteTrip(nuevoId);

    expect(useTripStore.getState().trip.id).toBe(originalId);
    expect(useTripStore.getState().listTrips()).toHaveLength(1);
  });

  it("refuses to delete the only trip, so the app always has one", () => {
    const soloId = useTripStore.getState().trip.id;
    useTripStore.getState().deleteTrip(soloId);
    expect(useTripStore.getState().trip.id).toBe(soloId);
  });
});
