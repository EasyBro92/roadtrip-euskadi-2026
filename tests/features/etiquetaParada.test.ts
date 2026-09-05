import { describe, expect, it } from "vitest";
import { etiquetaParada } from "../../src/features/itinerary/etiquetaParada";
import { formatDateLong } from "../../src/utils/format";
import { STOP_CATEGORIES } from "../../src/types";

describe("etiquetaParada", () => {
  it("pone las tildes que le faltaban al identificador", () => {
    // Se pintaba la clave tal cual con un `capitalize` encima, así que estas
    // tres salían mal escritas por toda la app.
    expect(etiquetaParada("gastronomia")).toBe("Gastronomía");
    expect(etiquetaParada("fotografia")).toBe("Fotografía");
    expect(etiquetaParada("historia")).toBe("Historia");
  });

  it("todas las categorías tienen etiqueta, y empieza en mayúscula", () => {
    // Recorre la lista de verdad: una categoría nueva sin etiqueta se cazaría
    // aquí en vez de aparecer en minúscula en la pantalla de alguien.
    for (const categoria of STOP_CATEGORIES) {
      const etiqueta = etiquetaParada(categoria);
      expect(etiqueta).not.toBe("");
      expect(etiqueta[0]).toBe(etiqueta[0].toUpperCase());
    }
  });

  it("una categoría desconocida se devuelve tal cual, sin romper", () => {
    // Puede llegar de un viaje importado.
    expect(etiquetaParada("submarinismo" as never)).toBe("submarinismo");
  });
});

describe("formatDateLong", () => {
  it("sube sólo la primera letra, no la de cada palabra", () => {
    /*
     * Se arreglaba con un `capitalize` de CSS, que sube la inicial de todas
     * las palabras: salía "Sábado, 29 De Agosto", con ese "De" en mitad de
     * la frase.
     */
    const texto = formatDateLong("2026-08-29");
    expect(texto.startsWith("Sábado")).toBe(true);
    expect(texto).toContain(" de ");
    expect(texto).not.toContain(" De ");
  });

  it("el mes va en minúscula, como en español", () => {
    expect(formatDateLong("2026-09-02")).toContain("septiembre");
  });
});
