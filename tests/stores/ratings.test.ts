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

  it("lists only the type asked for", () => {
    store().valorar("stop", "a", 5);
    store().valorar("stop", "b", 4);
    store().valorar("route", "c", 3);

    expect(store().listarPorTipo("stop")).toHaveLength(2);
    expect(store().listarPorTipo("route")).toHaveLength(1);
  });
});
