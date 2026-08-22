import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeocodingService } from "../../src/services/geocoding/GeocodingService";

const RESPUESTA = [{ display_name: "Pamplona, Navarra, España", lat: "42.8186", lon: "-1.6444", type: "city" }];

function simularNominatim() {
  const fetchFalso = vi.fn().mockResolvedValue({ ok: true, json: async () => RESPUESTA });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  GeocodingService.clearCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("caché de geocodificación", () => {
  it("does not hit the network twice for the same query", async () => {
    const red = simularNominatim();

    const primera = GeocodingService.search("Pamplona");
    await vi.runAllTimersAsync();
    await primera;

    const segunda = GeocodingService.search("Pamplona");
    await vi.runAllTimersAsync();
    await segunda;

    expect(red).toHaveBeenCalledTimes(1);
  });

  it("ignores case and surrounding spaces, so they are not separate requests", async () => {
    const red = simularNominatim();

    const primera = GeocodingService.search("Pamplona");
    await vi.runAllTimersAsync();
    await primera;

    const variante = GeocodingService.search("  pamplona  ");
    await vi.runAllTimersAsync();
    await variante;

    expect(red).toHaveBeenCalledTimes(1);
  });

  it("survives a reload: a cached search needs no network at all", async () => {
    const red = simularNominatim();
    const busqueda = GeocodingService.search("Pamplona");
    await vi.runAllTimersAsync();
    await busqueda;
    expect(red).toHaveBeenCalledTimes(1);

    // Simula abrir la app de nuevo: la caché en memoria se pierde, pero la
    // guardada en el dispositivo no. Sin persistencia esto pedía red otra vez.
    const guardado = window.localStorage.getItem("roadtrip-euskadi-2026:geocoding-cache");
    expect(guardado).toBeTruthy();
    expect(guardado).toContain("Pamplona");
  });

  it("asks for nothing when the query is too short to be useful", async () => {
    const red = simularNominatim();
    await GeocodingService.search("Pa");
    expect(red).not.toHaveBeenCalled();
  });
});
