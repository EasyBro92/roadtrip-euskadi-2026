import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";

const store = () => useTripStore.getState();
const NUEVO = { name: "Costa Brava", startDate: "2027-06-01", dayCount: 3 };

beforeEach(() => {
  store().resetAllData();
});

describe("restaurar la ruta original", () => {
  it("devuelve el itinerario sin llevarse los gastos, el bote ni los demás viajes", () => {
    const viajeroId = store().trip.travelers[0].id;
    store().addExpense({ date: "2026-08-29", time: "10:00", amountEUR: 30, category: "restaurante", place: "Bar", dayId: "day-1", stopId: null, kind: "actual" } as never);
    store().addAportacion(viajeroId, 100);
    store().createTrip(NUEVO);
    const otroId = store().trip.id;
    store().switchTrip(Object.keys(store().savedTrips)[0]);

    const primera = store().trip.days[0].stopIds[0];
    store().deleteStop(primera);
    expect(store().stopsById[primera]).toBeUndefined();

    store().restoreOriginalRoute();

    expect(store().stopsById[primera]).toBeDefined();
    expect(store().expenses).toHaveLength(1);
    expect(store().aportaciones).toHaveLength(1);
    expect(store().savedTrips[otroId]).toBeDefined();
  });

  it("respeta las fechas si el viaje se movió a otra semana", () => {
    store().recalculateDatesFromStart("2026-09-05");
    store().restoreOriginalRoute();

    const { trip, stopsById } = store();
    expect(trip.days[0].date).toBe("2026-09-05");
    expect(stopsById[trip.days[0].stopIds[0]].date).toBe("2026-09-05");
    expect(trip.endDate).toBe(trip.days[trip.days.length - 1].date);
  });

  it("no convierte en el de Euskadi un viaje creado por ti", () => {
    store().createTrip(NUEVO);
    store().restoreOriginalRoute();
    expect(store().trip.name).toBe("Costa Brava");
    expect(Object.keys(store().stopsById)).toHaveLength(0);
  });
});

describe("crear un viaje", () => {
  it("empieza con el bote vacío, y el del anterior vuelve al cambiar", () => {
    const viajeroId = store().trip.travelers[0].id;
    const original = store().trip.id;
    store().addAportacion(viajeroId, 100);

    store().createTrip(NUEVO);
    expect(store().aportaciones).toHaveLength(0);

    store().switchTrip(original);
    expect(store().aportaciones).toHaveLength(1);
  });
});

describe("importar una copia", () => {
  it("archiva el viaje abierto si la copia es de otro", () => {
    const original = store().trip.id;
    const copia = { ...store().trip, id: "trip-importado", name: "Importado" };

    store().importTripData({ trip: copia, stops: [], expenses: [], refuels: [], favorites: [], notes: [], checklist: [], achievementsState: [] });

    expect(store().trip.id).toBe("trip-importado");
    expect(store().savedTrips[original]).toBeDefined();
    expect(store().places).toHaveLength(0);
  });

  it("sustituye al abierto si la copia es del mismo viaje", () => {
    const trip = store().trip;
    store().importTripData({ trip: { ...trip, name: "Restaurado" }, stops: [], expenses: [], refuels: [], favorites: [], notes: [], checklist: [], achievementsState: [] });

    expect(store().trip.name).toBe("Restaurado");
    expect(Object.keys(store().savedTrips)).toHaveLength(0);
  });
});

describe("quitar días", () => {
  it("nunca deja el viaje sin ninguno", () => {
    store().createTrip({ ...NUEVO, dayCount: 1 });
    store().removeDay(store().trip.days[0].id);
    expect(store().trip.days).toHaveLength(1);
  });
});
