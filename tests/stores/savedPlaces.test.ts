import { beforeEach, describe, expect, it } from "vitest";
import { useSavedPlacesStore } from "../../src/stores/useSavedPlacesStore";

const store = () => useSavedPlacesStore.getState();

const LISBOA = { latitude: 38.7223, longitude: -9.1393 };
const OPORTO = { latitude: 41.1579, longitude: -8.6291 };

beforeEach(() => {
  useSavedPlacesStore.setState({ listas: [], lugares: [] });
});

describe("listas", () => {
  it("crea una lista con el nombre que le des", () => {
    store().crearLista("Portugal 2027");
    expect(store().listas.map((l) => l.nombre)).toEqual(["Portugal 2027"]);
  });

  it("crea sola la lista por defecto al guardar sin elegir ninguna", () => {
    // Pedir un nombre antes de dejarte guardar convierte un toque en un formulario.
    store().guardar({ nombre: "Torre de Belém", coordinates: LISBOA });

    expect(store().listas).toHaveLength(1);
    expect(store().listas[0].nombre).toBe("Quiero ir");
    expect(store().lugares[0].listaId).toBe(store().listas[0].id);
  });

  it("no acepta renombrar a un nombre en blanco", () => {
    const id = store().crearLista("Portugal");
    store().renombrarLista(id, "   ");
    expect(store().listas[0].nombre).toBe("Portugal");
  });

  it("borrar una lista se lleva sus sitios", () => {
    const portugal = store().crearLista("Portugal");
    const italia = store().crearLista("Italia");
    store().guardar({ nombre: "Belém", coordinates: LISBOA }, portugal);
    store().guardar({ nombre: "Coliseo", coordinates: OPORTO }, italia);

    store().borrarLista(portugal);

    // Dejar sitios huérfanos sería guardarlos donde ya no se pueden ver.
    expect(store().lugares.map((p) => p.nombre)).toEqual(["Coliseo"]);
  });
});

describe("sitios guardados", () => {
  it("no guarda dos veces el mismo sitio en la misma lista", () => {
    const id = store().crearLista("Portugal");
    const primera = store().guardar({ nombre: "Torre de Belém", coordinates: LISBOA }, id);
    const segunda = store().guardar({ nombre: "torre de belém", coordinates: LISBOA }, id);

    expect(store().lugares).toHaveLength(1);
    expect(segunda).toBe(primera);
  });

  it("sí permite el mismo sitio en dos listas distintas", () => {
    const a = store().crearLista("Con niños");
    const b = store().crearLista("Fotografía");
    store().guardar({ nombre: "Torre de Belém", coordinates: LISBOA }, a);
    store().guardar({ nombre: "Torre de Belém", coordinates: LISBOA }, b);

    expect(store().lugares).toHaveLength(2);
  });

  it("distingue dos sitios con el mismo nombre en ciudades distintas", () => {
    const id = store().crearLista("Catedrales");
    store().guardar({ nombre: "Catedral", coordinates: LISBOA }, id);
    store().guardar({ nombre: "Catedral", coordinates: OPORTO }, id);

    expect(store().lugares).toHaveLength(2);
  });

  it("mueve un sitio de una lista a otra", () => {
    const a = store().crearLista("Quiero ir");
    const b = store().crearLista("Verano");
    const sitio = store().guardar({ nombre: "Belém", coordinates: LISBOA }, a);

    store().moverA(sitio, b);

    expect(store().lugaresDe(a)).toHaveLength(0);
    expect(store().lugaresDe(b)).toHaveLength(1);
  });

  it("guarda una nota y descarta la que está en blanco", () => {
    const sitio = store().guardar({ nombre: "Belém", coordinates: LISBOA });
    store().ponerNota(sitio, "  Ir antes de las 10  ");
    expect(store().lugares[0].nota).toBe("Ir antes de las 10");

    store().ponerNota(sitio, "   ");
    expect(store().lugares[0].nota).toBeUndefined();
  });

  it("sabe si un sitio ya está guardado, esté en la lista que esté", () => {
    const b = store().crearLista("Otra");
    store().guardar({ nombre: "Belém", coordinates: LISBOA }, b);

    expect(store().estaGuardado("Belém", LISBOA)).toBe(true);
    expect(store().estaGuardado("Belém", OPORTO)).toBe(false);
  });

  it("lista los sitios con los más recientes primero", async () => {
    const id = store().crearLista("Quiero ir");
    store().guardar({ nombre: "Primero", coordinates: LISBOA }, id);
    await new Promise((r) => setTimeout(r, 5));
    store().guardar({ nombre: "Segundo", coordinates: OPORTO }, id);

    expect(store().lugaresDe(id).map((p) => p.nombre)).toEqual(["Segundo", "Primero"]);
  });

  it("quitar un sitio no toca los demás", () => {
    const id = store().crearLista("Quiero ir");
    const uno = store().guardar({ nombre: "Uno", coordinates: LISBOA }, id);
    store().guardar({ nombre: "Dos", coordinates: OPORTO }, id);

    store().quitar(uno);

    expect(store().lugaresDe(id).map((p) => p.nombre)).toEqual(["Dos"]);
  });
});
