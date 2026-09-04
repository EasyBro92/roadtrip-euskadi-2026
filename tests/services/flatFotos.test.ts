import { describe, expect, it } from "vitest";
import { fotosDelAlbum } from "../../src/services/album/flatFotos";

describe("fotosDelAlbum", () => {
  it("pone la portada de cada día antes que el resto de sus fotos", () => {
    const flat = fotosDelAlbum([
      { portada: "dia1-portada.jpg", extras: ["dia1-extra1.jpg", "dia1-extra2.jpg"] },
      { portada: "dia2-portada.jpg", extras: [] },
    ]);
    expect(flat).toEqual(["dia1-portada.jpg", "dia1-extra1.jpg", "dia1-extra2.jpg", "dia2-portada.jpg"]);
  });

  it("un día sin portada no deja un hueco", () => {
    // Un día que aún no tiene ninguna foto propia ni de sus paradas.
    const flat = fotosDelAlbum([{ extras: [] }, { portada: "dia2.jpg", extras: [] }]);
    expect(flat).toEqual(["dia2.jpg"]);
  });

  it("el orden es el mismo en que se pinta en pantalla", () => {
    /*
     * Esto es lo que hace que el visor pueda pasar de una foto a la
     * siguiente: el índice que se toca en pantalla tiene que ser el mismo
     * índice que ocupa esa foto en esta lista.
     */
    const dias = [
      { portada: "a.jpg", extras: ["b.jpg"] },
      { extras: ["c.jpg", "d.jpg"] },
      { portada: "e.jpg", extras: [] },
    ];
    const flat = fotosDelAlbum(dias);
    expect(flat.indexOf("c.jpg")).toBe(2);
    expect(flat.indexOf("e.jpg")).toBe(4);
  });

  it("un álbum sin fotos da una lista vacía", () => {
    expect(fotosDelAlbum([])).toEqual([]);
    expect(fotosDelAlbum([{ extras: [] }])).toEqual([]);
  });
});
