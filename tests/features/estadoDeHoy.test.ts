import { describe, expect, it } from "vitest";
import { estadoDeHoy } from "../../src/features/itinerary/estadoDeHoy";
import type { Stop, StopCategory } from "../../src/types";

function parada(id: string, category: StopCategory, visited = false, enabled = true): Stop {
  return {
    id,
    dayId: "d1",
    name: id,
    category,
    coordinates: { latitude: 0, longitude: 0 },
    recommendedDurationMinutes: 30,
    optional: false,
    visited,
    enabled,
    googleMapsUrl: "",
    photographyRating: 3,
    order: 0,
  } as unknown as Stop;
}

const BASE = { numeroDeDia: 2, totalDias: 5, hayCoche: false };

describe("estadoDeHoy", () => {
  it("la siguiente es la primera sin visitar", () => {
    const stops = [parada("a", "cultura", true), parada("b", "paisaje"), parada("c", "ciudad")];
    expect(estadoDeHoy({ ...BASE, stops }).siguiente?.id).toBe("b");
  });

  it("el hotel y el aparcamiento no cuentan como paradas que visitar", () => {
    // Son logística del día, no sitios a los que vas.
    const stops = [parada("hotel", "hotel"), parada("parking", "aparcamiento"), parada("mirador", "mirador")];
    const r = estadoDeHoy({ ...BASE, stops });

    expect(r.siguiente?.id).toBe("mirador");
    expect(r.pendientes).toBe(1);
  });

  it("no hay siguiente cuando está todo visitado", () => {
    const stops = [parada("a", "cultura", true), parada("hotel", "hotel")];
    const r = estadoDeHoy({ ...BASE, stops });

    expect(r.siguiente).toBeNull();
    expect(r.pendientes).toBe(0);
    expect(r.avisos.map((a) => a.id)).toContain("completo");
  });

  it("avisa de la noche sin hotel", () => {
    const stops = [parada("a", "cultura")];
    expect(estadoDeHoy({ ...BASE, stops }).avisos.map((a) => a.id)).toContain("sin-hotel");
  });

  it("no avisa de la noche sin hotel si hay hotel", () => {
    const stops = [parada("a", "cultura"), parada("h", "hotel")];
    expect(estadoDeHoy({ ...BASE, stops }).avisos.map((a) => a.id)).not.toContain("sin-hotel");
  });

  it("el último día no avisa de que falta hotel", () => {
    /*
     * Se vuelve a casa. Avisar de que no hay hotel la noche que duermes en tu
     * cama es ruido, y el ruido enseña a ignorar los avisos de verdad.
     */
    const stops = [parada("a", "cultura")];
    const r = estadoDeHoy({ ...BASE, stops, numeroDeDia: 5, totalDias: 5 });
    expect(r.avisos.map((a) => a.id)).not.toContain("sin-hotel");
  });

  it("avisa del coche sólo si está marcado", () => {
    const stops = [parada("a", "cultura"), parada("h", "hotel")];
    expect(estadoDeHoy({ ...BASE, stops, hayCoche: true }).avisos.map((a) => a.id)).toContain("coche");
    expect(estadoDeHoy({ ...BASE, stops, hayCoche: false }).avisos.map((a) => a.id)).not.toContain("coche");
  });

  it("ignora las paradas desactivadas", () => {
    const stops = [parada("apagada", "cultura", false, false), parada("activa", "paisaje")];
    const r = estadoDeHoy({ ...BASE, stops });

    expect(r.siguiente?.id).toBe("activa");
    expect(r.pendientes).toBe(1);
  });

  it("un hotel desactivado no cuenta como hotel", () => {
    const stops = [parada("h", "hotel", false, false), parada("a", "cultura")];
    expect(estadoDeHoy({ ...BASE, stops }).avisos.map((a) => a.id)).toContain("sin-hotel");
  });

  it("un día vacío no dice que lo hayas visitado todo", () => {
    const r = estadoDeHoy({ ...BASE, stops: [] });
    expect(r.avisos.map((a) => a.id)).not.toContain("completo");
    expect(r.siguiente).toBeNull();
  });

  it("cuenta visitadas y pendientes", () => {
    const stops = [parada("a", "cultura", true), parada("b", "ciudad", true), parada("c", "playa")];
    const r = estadoDeHoy({ ...BASE, stops });
    expect(r.visitadas).toBe(2);
    expect(r.pendientes).toBe(1);
  });
});
