import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";

beforeEach(() => {
  useTripStore.getState().resetAllData();
});

describe("useTripStore favorites", () => {
  it("toggles a favorite on and off", () => {
    const { toggleFavorite, isFavorite } = useTripStore.getState();
    expect(isFavorite("stop", "stop-girona")).toBe(false);

    toggleFavorite("stop", "stop-girona");
    expect(useTripStore.getState().isFavorite("stop", "stop-girona")).toBe(true);

    useTripStore.getState().toggleFavorite("stop", "stop-girona");
    expect(useTripStore.getState().isFavorite("stop", "stop-girona")).toBe(false);
  });
});

describe("useTripStore expenses", () => {
  it("adds an expense with a generated id and timestamps", () => {
    useTripStore.getState().addExpense({
      date: "2026-08-29",
      time: "14:00",
      amountEUR: 12.5,
      category: "gastronomia" as never,
      place: "Huesca",
      dayId: "day-1",
      stopId: null,
      paidByTravelerId: null,
      splitBetweenTravelerIds: [],
      paymentMethod: "tarjeta",
      notes: "",
      receiptPhotoId: null,
      kind: "actual",
    });

    const expenses = useTripStore.getState().expenses;
    expect(expenses).toHaveLength(1);
    expect(expenses[0].id).toBeTruthy();
    expect(expenses[0].amountEUR).toBe(12.5);
  });
});

describe("useTripStore stop lifecycle", () => {
  it("marks a stop visited and records visitedAt", () => {
    useTripStore.getState().setStopVisited("stop-girona", true);
    const stop = useTripStore.getState().stopsById["stop-girona"];
    expect(stop.visited).toBe(true);
    expect(stop.visitStatus).toBe("completed");
    expect(stop.visitedAt).toBeTruthy();
  });

  it("reorders stops within a day and keeps the day's stopIds in sync", () => {
    const store = useTripStore.getState();
    const day1 = store.trip.days.find((d) => d.id === "day-1")!;
    const reversed = [...day1.stopIds].reverse();

    store.reorderStopsInDay("day-1", reversed);

    const updatedDay = useTripStore.getState().trip.days.find((d) => d.id === "day-1")!;
    expect(updatedDay.stopIds).toEqual(reversed);
  });

  it("deletes a stop and removes it from its day's stopIds", () => {
    const store = useTripStore.getState();
    const day1Before = store.trip.days.find((d) => d.id === "day-1")!;
    const stopToRemove = day1Before.stopIds[0];

    store.deleteStop(stopToRemove);

    const state = useTripStore.getState();
    expect(state.stopsById[stopToRemove]).toBeUndefined();
    expect(state.trip.days.find((d) => d.id === "day-1")!.stopIds).not.toContain(stopToRemove);
  });
});

describe("useTripStore undo/redo", () => {
  it("restores the previous snapshot after undo", () => {
    const store = useTripStore.getState();
    store.pushSnapshot("before rename");
    store.setTripMeta({ name: "Nombre modificado" });
    expect(useTripStore.getState().trip.name).toBe("Nombre modificado");

    useTripStore.getState().undo();
    expect(useTripStore.getState().trip.name).toBe("Roadtrip Euskadi 2026");
  });
});
