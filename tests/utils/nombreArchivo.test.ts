import { describe, expect, it } from "vitest";
import { nombreArchivo } from "../../src/utils/nombreArchivo";

describe("nombreArchivo", () => {
  it("quita acentos, espacios y signos", () => {
    expect(nombreArchivo("Roadtrip Euskadi 2026", "viaje")).toBe("roadtrip-euskadi-2026");
    expect(nombreArchivo("Vacaciones en Aragón & Navarra", "viaje")).toBe("vacaciones-en-aragon-navarra");
  });

  it("no deja guiones colgando en los extremos", () => {
    expect(nombreArchivo("  ¡Verano!  ", "viaje")).toBe("verano");
  });

  it("recurre al nombre por defecto cuando no queda nada", () => {
    // Un viaje llamado sólo con emojis o signos deja la cadena vacía, y un
    // fichero sin nombre no se puede descargar.
    expect(nombreArchivo("🚗✨", "viaje")).toBe("viaje");
    expect(nombreArchivo("", "viaje")).toBe("viaje");
  });

  it("recorta los nombres larguísimos", () => {
    expect(nombreArchivo("a".repeat(80), "viaje")).toHaveLength(40);
  });
});
