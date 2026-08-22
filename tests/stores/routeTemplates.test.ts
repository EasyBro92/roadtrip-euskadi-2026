import { beforeEach, describe, expect, it } from "vitest";
import { ROUTE_TEMPLATES, getRouteTemplate } from "../../src/data/routeTemplates.data";
import { useTripStore } from "../../src/stores/useTripStore";

beforeEach(() => {
  useTripStore.getState().resetAllData();
});

describe("catálogo de rutas", () => {
  it("every stop belongs to a day the route actually has", () => {
    for (const ruta of ROUTE_TEMPLATES) {
      for (const parada of ruta.stops) {
        expect(parada.dayIndex).toBeGreaterThanOrEqual(1);
        expect(parada.dayIndex).toBeLessThanOrEqual(ruta.dayCount);
      }
    }
  });

  it("has plausible coordinates for Spain, so a bad paste is caught", () => {
    for (const ruta of ROUTE_TEMPLATES) {
      for (const { name, coordinates } of ruta.stops) {
        expect(coordinates.latitude, `${name} latitud`).toBeGreaterThan(35);
        expect(coordinates.latitude, `${name} latitud`).toBeLessThan(44);
        expect(coordinates.longitude, `${name} longitud`).toBeGreaterThan(-10);
        expect(coordinates.longitude, `${name} longitud`).toBeLessThan(5);
      }
    }
  });

  it("leaves no day of a route empty", () => {
    for (const ruta of ROUTE_TEMPLATES) {
      for (let dia = 1; dia <= ruta.dayCount; dia++) {
        expect(ruta.stops.some((s) => s.dayIndex === dia), `${ruta.name} día ${dia}`).toBe(true);
      }
    }
  });
});

describe("createTripFromTemplate", () => {
  const costaBrava = () => getRouteTemplate("ruta-costa-brava")!;

  it("creates a trip with the route's days and stops", () => {
    const ruta = costaBrava();
    useTripStore.getState().createTripFromTemplate(ruta, "2027-05-10");

    const { trip, stopsById } = useTripStore.getState();
    expect(trip.name).toBe(ruta.name);
    expect(trip.days).toHaveLength(ruta.dayCount);
    expect(Object.keys(stopsById)).toHaveLength(ruta.stops.length);
    expect(trip.days[0].date).toBe("2027-05-10");
  });

  it("puts each stop on its own day, in order", () => {
    const ruta = costaBrava();
    useTripStore.getState().createTripFromTemplate(ruta, "2027-05-10");
    const { trip, stopsById } = useTripStore.getState();

    for (const dia of trip.days) {
      const esperadas = ruta.stops.filter((s) => s.dayIndex === dia.index).map((s) => s.name);
      const reales = dia.stopIds.map((id) => stopsById[id].name);
      expect(reales).toEqual(esperadas);
    }
  });

  it("does not touch the catalogue: the copy gets fresh ids", () => {
    const ruta = costaBrava();
    const antes = JSON.stringify(ruta);
    useTripStore.getState().createTripFromTemplate(ruta, "2027-05-10");

    expect(JSON.stringify(getRouteTemplate("ruta-costa-brava"))).toBe(antes);
    for (const id of Object.keys(useTripStore.getState().stopsById)) {
      expect(id.startsWith("stop-")).toBe(true);
    }
  });

  it("archives the previous trip instead of overwriting it", () => {
    const anteriorId = useTripStore.getState().trip.id;
    useTripStore.getState().createTripFromTemplate(costaBrava(), "2027-05-10");

    const viajes = useTripStore.getState().listTrips();
    expect(viajes).toHaveLength(2);
    expect(viajes.some((v) => v.id === anteriorId)).toBe(true);
  });

  it("keeps Euskadi's stops intact when switching back", () => {
    const anteriorId = useTripStore.getState().trip.id;
    const paradasAntes = Object.keys(useTripStore.getState().stopsById).length;

    useTripStore.getState().createTripFromTemplate(costaBrava(), "2027-05-10");
    useTripStore.getState().switchTrip(anteriorId);

    expect(Object.keys(useTripStore.getState().stopsById)).toHaveLength(paradasAntes);
  });
});
