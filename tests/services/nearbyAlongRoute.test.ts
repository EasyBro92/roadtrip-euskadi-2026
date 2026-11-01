import { afterEach, describe, expect, it, vi } from "vitest";
import { NearbyService, kmEnElTrayecto, olvidarCercanos, simplificarTrayecto } from "../../src/services/places/NearbyService";

const A = { latitude: 43.0, longitude: -2.0 };
const B = { latitude: 43.0, longitude: -1.0 };

afterEach(() => {
  vi.restoreAllMocks();
  olvidarCercanos();
});

describe("simplificarTrayecto", () => {
  it("keeps first and last point and caps the length", () => {
    const largo = Array.from({ length: 500 }, (_, i) => ({ latitude: 43, longitude: -2 + i / 500 }));
    const corto = simplificarTrayecto(largo, 60);
    expect(corto).toHaveLength(60);
    expect(corto[0]).toBe(largo[0]);
    expect(corto.at(-1)).toBe(largo.at(-1));
  });
});

describe("kmEnElTrayecto", () => {
  it("measures how far along the route a place is", () => {
    const trayecto = [A, { latitude: 43, longitude: -1.5 }, B];
    expect(kmEnElTrayecto(trayecto, { latitude: 43.01, longitude: -1.5 })).toBeCloseTo(40.7, 0);
  });
});

describe("searchAlongRoute", () => {
  it("asks Overpass along the line and sorts by km on the route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          elements: [
            { id: 2, lat: 43.0, lon: -1.1, tags: { name: "Lejos" } },
            { id: 1, lat: 43.0, lon: -1.9, tags: { name: "Cerca" } },
          ],
        }),
      ),
    );
    const r = await NearbyService.searchAlongRoute([A, B], "gasolinera");
    expect(r.map((x) => x.name)).toEqual(["Cerca", "Lejos"]);
    const cuerpo = decodeURIComponent(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(cuerpo).toContain("around:2000,43.00000,-2.00000,43.00000,-1.00000");
  });
});
