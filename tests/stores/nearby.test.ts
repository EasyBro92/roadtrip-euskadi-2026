import { beforeEach, describe, expect, it, vi } from "vitest";
import { NearbyService, type NearbyPlace } from "../../src/services/places/NearbyService";
import { useNearbyStore } from "../../src/stores/useNearbyStore";

const CENTRO = { latitude: 43.26, longitude: -2.93 };

function lugar(nombre: string): NearbyPlace {
  return {
    id: nombre,
    name: nombre,
    category: "restaurante",
    coordinates: CENTRO,
    distanceMeters: 100,
    isReal: true,
  };
}

const store = () => useNearbyStore.getState();

beforeEach(() => {
  vi.restoreAllMocks();
  useNearbyStore.setState({ categoria: null, resultados: [], centro: null, cargando: false, error: null, resaltado: null });
});

describe("buscar cerca", () => {
  it("guarda los resultados de la categoría pedida", async () => {
    vi.spyOn(NearbyService, "search").mockResolvedValue([lugar("Repsol")]);

    await store().buscar(CENTRO, "gasolinera");

    expect(store().categoria).toBe("gasolinera");
    expect(store().resultados.map((r) => r.name)).toEqual(["Repsol"]);
    expect(store().cargando).toBe(false);
  });

  it("una respuesta lenta no pisa a la búsqueda posterior", async () => {
    /*
     * El fallo real: tocas Restaurantes, tarda; tocas Farmacias, responde
     * antes; y al llegar la lenta deja bares bajo el rótulo de "Farmacias".
     */
    let resolverLenta: (v: NearbyPlace[]) => void = () => {};
    const lenta = new Promise<NearbyPlace[]>((r) => (resolverLenta = r));

    vi.spyOn(NearbyService, "search")
      .mockImplementationOnce(() => lenta)
      .mockImplementationOnce(async () => [lugar("Farmacia Central")]);

    const primera = store().buscar(CENTRO, "restaurante");
    await store().buscar(CENTRO, "farmacia");

    expect(store().resultados.map((r) => r.name)).toEqual(["Farmacia Central"]);

    resolverLenta([lugar("Ocre Bar")]);
    await primera;

    // Lo que manda es la última que pediste, no la última que contestó.
    expect(store().categoria).toBe("farmacia");
    expect(store().resultados.map((r) => r.name)).toEqual(["Farmacia Central"]);
  });

  it("un fallo tardío tampoco borra la búsqueda buena", async () => {
    let rechazarLenta: (e: Error) => void = () => {};
    const lenta = new Promise<NearbyPlace[]>((_, rechazar) => (rechazarLenta = rechazar));

    vi.spyOn(NearbyService, "search")
      .mockImplementationOnce(() => lenta)
      .mockImplementationOnce(async () => [lugar("Farmacia Central")]);

    const primera = store().buscar(CENTRO, "restaurante");
    await store().buscar(CENTRO, "farmacia");

    rechazarLenta(new Error("Overpass respondió 504"));
    await primera;

    expect(store().error).toBeNull();
    expect(store().resultados).toHaveLength(1);
  });

  it("distingue el corte por tiempo de un fallo cualquiera", async () => {
    const corte = new Error("tardó demasiado");
    corte.name = "TimeoutError";
    vi.spyOn(NearbyService, "search").mockRejectedValue(corte);

    await store().buscar(CENTRO, "gasolinera");

    expect(store().error).toMatch(/tardando demasiado/i);
    expect(store().resultados).toEqual([]);
  });

  it("da un mensaje distinto cuando el fallo no es de tiempo", async () => {
    vi.spyOn(NearbyService, "search").mockRejectedValue(new Error("Failed to fetch"));

    await store().buscar(CENTRO, "gasolinera");

    expect(store().error).toMatch(/no se ha podido consultar/i);
  });

  it("limpiar deja el mapa sin resultados", async () => {
    vi.spyOn(NearbyService, "search").mockResolvedValue([lugar("Repsol")]);
    await store().buscar(CENTRO, "gasolinera");

    store().limpiar();

    expect(store().resultados).toEqual([]);
    expect(store().categoria).toBeNull();
  });
});
