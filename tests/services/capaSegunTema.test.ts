import { describe, expect, it } from "vitest";
import { capaSegunTema } from "../../src/services/map/capaSegunTema";

describe("capaSegunTema", () => {
  it("en claro no cambia nada", () => {
    for (const id of ["roads", "light", "classic", "dark", "relief", "satellite"] as const) {
      expect(capaSegunTema(id, false)).toBe(id);
    }
  });

  it("en oscuro, los mapas de calles pasan a su versión nocturna", () => {
    expect(capaSegunTema("roads", true)).toBe("dark");
    expect(capaSegunTema("light", true)).toBe("dark");
    expect(capaSegunTema("classic", true)).toBe("dark");
  });

  it("no toca los mapas que se eligen por lo que enseñan", () => {
    /*
     * El relieve se elige por las curvas de nivel y el satélite por la foto
     * real. No existe una versión de noche de eso: oscurecerlos sería
     * estropear justo el dato por el que se han elegido.
     */
    expect(capaSegunTema("relief", true)).toBe("relief");
    expect(capaSegunTema("satellite", true)).toBe("satellite");
    expect(capaSegunTema("cycling", true)).toBe("cycling");
  });

  it("el mapa oscuro elegido a mano sigue siendo el oscuro", () => {
    expect(capaSegunTema("dark", true)).toBe("dark");
    expect(capaSegunTema("dark", false)).toBe("dark");
  });
});
