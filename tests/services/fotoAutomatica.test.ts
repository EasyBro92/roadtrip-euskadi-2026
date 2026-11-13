import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FotoAutomaticaService, esFotoDeVerdad } from "../../src/services/photos/FotoAutomaticaService";

const RONDA = { nombre: "Ronda", coordinates: { latitude: 36.742, longitude: -5.167 } };
const FOTO = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Puente_Nuevo.jpg/640px-Puente_Nuevo.jpg";

function responder(...paginas: unknown[][]) {
  const fetchFalso = vi.fn();
  for (const pages of paginas) fetchFalso.mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages } }) });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  localStorage.clear();
  FotoAutomaticaService._olvidar();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("foto automática de un sitio", () => {
  it("usa la imagen del artículo que se llama igual y está allí", async () => {
    const fetchFalso = responder([{ title: "Ronda", thumbnail: { source: FOTO }, coordinates: [{ lat: 36.737, lon: -5.165 }] }]);

    expect(await FotoAutomaticaService.buscar(RONDA)).toBe(FOTO);
    expect(String(fetchFalso.mock.calls[0][0])).toContain("es.wikipedia.org");
    expect(String(fetchFalso.mock.calls[0][0])).toContain("titles=Ronda");
  });

  it("rechaza un homónimo en otra parte del mundo", async () => {
    // Córdoba (Argentina) al buscar la de Andalucía: mismo nombre, 9.000 km.
    responder(
      [{ title: "Córdoba", thumbnail: { source: FOTO }, coordinates: [{ lat: -31.42, lon: -64.18 }] }],
      [{ title: "Córdoba", missing: true }],
    );
    const cordoba = { nombre: "Córdoba", coordinates: { latitude: 37.88, longitude: -4.78 } };

    expect(await FotoAutomaticaService.buscar(cordoba)).toBeNull();
  });

  it("no acepta un artículo sin coordenadas, como una página de desambiguación", async () => {
    responder([{ title: "Ronda", thumbnail: { source: FOTO } }], [{ title: "Ronda", missing: true }]);
    expect(await FotoAutomaticaService.buscar(RONDA)).toBeNull();
  });

  it("descarta escudos y banderas y prueba en la Wikipedia en inglés", async () => {
    const escudo = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Escudo_de_Ronda.svg/640px-Escudo_de_Ronda.svg.png";
    const fetchFalso = responder(
      [{ title: "Ronda", thumbnail: { source: escudo }, coordinates: [{ lat: 36.737, lon: -5.165 }] }],
      [{ title: "Ronda", thumbnail: { source: FOTO }, coordinates: [{ lat: 36.737, lon: -5.165 }] }],
    );

    expect(await FotoAutomaticaService.buscar(RONDA)).toBe(FOTO);
    expect(String(fetchFalso.mock.calls[1][0])).toContain("en.wikipedia.org");
  });

  it("pregunta una sola vez por sitio, también cuando no hay foto", async () => {
    const fetchFalso = responder([{ title: "Ronda", missing: true }], [{ title: "Ronda", missing: true }]);

    expect(await FotoAutomaticaService.buscar(RONDA)).toBeNull();
    expect(await FotoAutomaticaService.buscar(RONDA)).toBeNull();
    expect(FotoAutomaticaService.conocida(RONDA)).toBeNull();
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("recuerda la foto entre sesiones", async () => {
    responder([{ title: "Ronda", thumbnail: { source: FOTO }, coordinates: [{ lat: 36.737, lon: -5.165 }] }]);
    await FotoAutomaticaService.buscar(RONDA);

    FotoAutomaticaService._olvidar(); // como si se cerrara y abriera la app
    expect(FotoAutomaticaService.conocida(RONDA)).toBe(FOTO);
  });

  it("sin conexión no apunta un 'no hay': lo vuelve a intentar después", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect(await FotoAutomaticaService.buscar(RONDA)).toBeNull();
    expect(FotoAutomaticaService.conocida(RONDA)).toBeUndefined();
  });

  it("no busca foto para hoteles ni aparcamientos", async () => {
    const fetchFalso = responder([]);
    expect(await FotoAutomaticaService.buscar({ ...RONDA, nombre: "Hotel Catalonia", category: "hotel" })).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe("esFotoDeVerdad", () => {
  it("distingue una fotografía de un escudo, una bandera o un mapa", () => {
    expect(esFotoDeVerdad(FOTO)).toBe(true);
    expect(esFotoDeVerdad("https://upload.wikimedia.org/x/Bandera_de_Navarra.svg/640px-Bandera_de_Navarra.svg.png")).toBe(false);
    expect(esFotoDeVerdad("https://upload.wikimedia.org/x/640px-Spain_location_map.png")).toBe(false);
  });
});
