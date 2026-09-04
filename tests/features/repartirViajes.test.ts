import { describe, expect, it } from "vitest";
import { repartirViajes } from "../../src/features/trips/repartirViajes";
import type { TripSummary } from "../../src/stores/useTripStore";

function viaje(id: string, startDate: string, endDate: string, isActive = false): TripSummary {
  return { id, name: id, startDate, endDate, dayCount: 3, stopCount: 5, budgetEUR: 0, isActive };
}

const HOY = "2026-09-05";

describe("repartirViajes", () => {
  it("el activo va arriba aunque ya haya terminado", () => {
    // Es el caso real: vuelves el día 3 y el día 5 sigues cuadrando gastos.
    const euskadi = viaje("euskadi", "2026-08-29", "2026-09-03", true);
    const { activo, terminados } = repartirViajes([euskadi], HOY);

    expect(activo).toBe(euskadi);
    expect(terminados).toHaveLength(0);
  });

  it("manda a la pila los terminados que no son el activo", () => {
    const activo = viaje("activo", "2026-10-01", "2026-10-05", true);
    const viejo = viaje("viejo", "2025-06-01", "2025-06-10");
    const { terminados, proximos } = repartirViajes([activo, viejo], HOY);

    expect(terminados.map((v) => v.id)).toEqual(["viejo"]);
    expect(proximos).toHaveLength(0);
  });

  it("un viaje que acaba hoy todavía no está terminado", () => {
    const hoyMismo = viaje("hoy", "2026-09-01", HOY);
    const { proximos, terminados } = repartirViajes([viaje("otro", "2026-01-01", "2026-01-02", true), hoyMismo], HOY);

    expect(proximos.map((v) => v.id)).toEqual(["hoy"]);
    expect(terminados).toHaveLength(0);
  });

  it("separa futuros y pasados a la vez", () => {
    const activo = viaje("activo", "2026-09-01", "2026-09-10", true);
    const futuro = viaje("futuro", "2027-01-01", "2027-01-08");
    const pasado1 = viaje("pasado1", "2025-05-01", "2025-05-06");
    const pasado2 = viaje("pasado2", "2024-05-01", "2024-05-06");

    const { activo: a, proximos, terminados } = repartirViajes([activo, futuro, pasado1, pasado2], HOY);

    expect(a?.id).toBe("activo");
    expect(proximos.map((v) => v.id)).toEqual(["futuro"]);
    expect(terminados.map((v) => v.id)).toEqual(["pasado1", "pasado2"]);
  });

  it("respeta el orden en que vienen", () => {
    const activo = viaje("activo", "2026-09-01", "2026-09-10", true);
    const a = viaje("a", "2025-05-01", "2025-05-06");
    const b = viaje("b", "2024-05-01", "2024-05-06");

    expect(repartirViajes([activo, a, b], HOY).terminados.map((v) => v.id)).toEqual(["a", "b"]);
    expect(repartirViajes([activo, b, a], HOY).terminados.map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("aguanta una lista sin activo", () => {
    const { activo, terminados } = repartirViajes([viaje("x", "2025-01-01", "2025-01-05")], HOY);
    expect(activo).toBeNull();
    expect(terminados.map((v) => v.id)).toEqual(["x"]);
  });

  it("aguanta una lista vacía", () => {
    expect(repartirViajes([], HOY)).toEqual({ activo: null, proximos: [], terminados: [] });
  });
});
