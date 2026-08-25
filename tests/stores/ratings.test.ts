import { beforeEach, describe, expect, it } from "vitest";
import { useRatingsStore } from "../../src/stores/useRatingsStore";

beforeEach(() => {
  useRatingsStore.setState({ valoraciones: {} });
});

const store = () => useRatingsStore.getState();

describe("valoraciones", () => {
  it("stores a rating and reads it back", () => {
    store().valorar("stop", "stop-girona", 4);
    expect(store().valoracionDe("stop", "stop-girona")?.estrellas).toBe(4);
  });

  it("keeps stop and route ratings apart even with the same id", () => {
    store().valorar("stop", "madrid", 5);
    store().valorar("route", "madrid", 2);

    expect(store().valoracionDe("stop", "madrid")?.estrellas).toBe(5);
    expect(store().valoracionDe("route", "madrid")?.estrellas).toBe(2);
  });

  it("replaces the rating instead of adding a second one", () => {
    store().valorar("route", "ruta-madrid", 3);
    store().valorar("route", "ruta-madrid", 5);

    expect(store().listarPorTipo("route")).toHaveLength(1);
    expect(store().valoracionDe("route", "ruta-madrid")?.estrellas).toBe(5);
  });

  it("keeps the original date when a rating is changed", () => {
    store().valorar("stop", "stop-girona", 3);
    const creada = store().valoracionDe("stop", "stop-girona")!.createdAt;

    store().valorar("stop", "stop-girona", 1);
    const despues = store().valoracionDe("stop", "stop-girona")!;

    expect(despues.createdAt).toBe(creada);
    expect(despues.updatedAt >= creada).toBe(true);
  });

  it("removes a rating", () => {
    store().valorar("stop", "stop-girona", 4);
    store().quitarValoracion("stop", "stop-girona");
    expect(store().valoracionDe("stop", "stop-girona")).toBeUndefined();
  });

  it("ignores an empty comment instead of storing blank text", () => {
    store().valorar("stop", "stop-girona", 4, "   ");
    expect(store().valoracionDe("stop", "stop-girona")?.comentario).toBeUndefined();
  });

  it("keeps the written review when you only change the stars", () => {
    // Tocar una estrella en la ficha no puede llevarse por delante lo escrito.
    store().guardarResena("stop", "prado", 5, { comentario: "Enorme", consejo: "Ve temprano", compania: "pareja" });
    store().valorar("stop", "prado", 4);

    const v = store().valoracionDe("stop", "prado")!;
    expect(v.estrellas).toBe(4);
    expect(v.comentario).toBe("Enorme");
    expect(v.consejo).toBe("Ve temprano");
    expect(v.compania).toBe("pareja");
  });

  it("lists only the type asked for", () => {
    store().valorar("stop", "a", 5);
    store().valorar("stop", "b", 4);
    store().valorar("route", "c", 3);

    expect(store().listarPorTipo("stop")).toHaveLength(2);
    expect(store().listarPorTipo("route")).toHaveLength(1);
  });
});

describe("reseñas completas", () => {
  it("guarda todos los campos de una reseña", () => {
    store().guardarResena("stop", "prado", 5, {
      comentario: "Impresionante",
      fechaVisita: "2026-04-12",
      compania: "familia",
      consejo: "Entra por la puerta de Goya",
      fotos: ["f1", "f2"],
    });

    expect(store().valoracionDe("stop", "prado")).toMatchObject({
      estrellas: 5,
      comentario: "Impresionante",
      fechaVisita: "2026-04-12",
      compania: "familia",
      consejo: "Entra por la puerta de Goya",
      fotos: ["f1", "f2"],
    });
  });

  it("al editar, borrar el texto lo borra de verdad", () => {
    // Aquí sí manda lo que mandes: si vacías el comentario es que lo quitas.
    store().guardarResena("stop", "prado", 4, { comentario: "Primera versión" });
    store().guardarResena("stop", "prado", 4, { comentario: "  " });

    expect(store().valoracionDe("stop", "prado")?.comentario).toBeUndefined();
  });

  it("no guarda una lista de fotos vacía", () => {
    store().guardarResena("route", "ruta-madrid", 3, { fotos: [] });
    expect(store().valoracionDe("route", "ruta-madrid")?.fotos).toBeUndefined();
  });

  it("conserva la fecha de creación al editar la reseña", () => {
    store().guardarResena("stop", "prado", 3, { comentario: "A" });
    const creada = store().valoracionDe("stop", "prado")!.createdAt;

    store().guardarResena("stop", "prado", 5, { comentario: "B" });
    expect(store().valoracionDe("stop", "prado")!.createdAt).toBe(creada);
  });

  it("una reseña de ruta y otra de sitio con el mismo id no se pisan", () => {
    store().guardarResena("stop", "madrid", 5, { comentario: "La ciudad" });
    store().guardarResena("route", "madrid", 2, { comentario: "La ruta" });

    expect(store().valoracionDe("stop", "madrid")?.comentario).toBe("La ciudad");
    expect(store().valoracionDe("route", "madrid")?.comentario).toBe("La ruta");
  });
});
