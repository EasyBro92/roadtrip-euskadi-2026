import { beforeEach, describe, expect, it } from "vitest";
import { TODAS_LAS_RUTAS as ROUTE_TEMPLATES, getRouteTemplate } from "../../src/data/routeTemplates.data";
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

  it("has plausible coordinates, so a bad paste is caught", () => {
    // El catálogo empezó siendo español, luego europeo, y ahora llega de
    // Canarias y Marruecos (27° N) a Islandia (66° N, 22° O). El margen es
    // ese. Sigue sirviendo para detectar un cero o unas coordenadas
    // intercambiadas; los homónimos los caza la prueba de abajo.
    for (const ruta of ROUTE_TEMPLATES) {
      for (const { name, coordinates } of ruta.stops) {
        expect(coordinates.latitude, `${name} latitud`).toBeGreaterThan(27);
        expect(coordinates.latitude, `${name} latitud`).toBeLessThan(67);
        expect(coordinates.longitude, `${name} longitud`).toBeGreaterThan(-25);
        expect(coordinates.longitude, `${name} longitud`).toBeLessThan(30);
      }
    }
  });

  it("never jumps across a continent between two stops of the same route", () => {
    // Un "San José" resuelto en otra provincia, o un pueblo francés homónimo
    // a 600 km, pasa la prueba anterior. Ésta no: dentro de una ruta ninguna
    // parada queda a más de 420 km de la anterior (la más larga real es
    // Essaouira → Casablanca, unos 310).
    const rad = (x: number) => (x * Math.PI) / 180;
    for (const ruta of ROUTE_TEMPLATES) {
      for (let i = 1; i < ruta.stops.length; i++) {
        const a = ruta.stops[i - 1].coordinates;
        const b = ruta.stops[i].coordinates;
        const h =
          Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
          Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
        const km = 12742 * Math.asin(Math.sqrt(h));
        expect(km, `${ruta.name}: ${ruta.stops[i - 1].name} → ${ruta.stops[i].name}`).toBeLessThan(420);
      }
    }
  });

  it("has no duplicated stop names within a route", () => {
    for (const ruta of ROUTE_TEMPLATES) {
      const nombres = ruta.stops.map((s) => s.name);
      expect(new Set(nombres).size, `${ruta.name} repite paradas`).toBe(nombres.length);
    }
  });

  it("gives every route a unique id", () => {
    const ids = ROUTE_TEMPLATES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
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
