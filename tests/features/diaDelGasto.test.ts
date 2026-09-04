import { describe, expect, it } from "vitest";
import { diaDeLaFecha } from "../../src/features/expenses/diaDelGasto";
import type { TripDay } from "../../src/types";

const dias = [
  { id: "day-1", date: "2026-08-29" },
  { id: "day-2", date: "2026-08-30" },
  { id: "day-3", date: "2026-08-31" },
] as TripDay[];

describe("diaDeLaFecha", () => {
  it("pone el gasto en el día de su fecha, no en el que estás mirando", () => {
    /*
     * El caso real del viaje: el repostaje del 30 por la mañana acabó en el
     * día 31 porque al apuntarlo estaba mirando el día siguiente. El gasto
     * por día del Diario contaba mal los dos días.
     */
    expect(diaDeLaFecha(dias, "2026-08-30", "day-3")).toBe("day-2");
  });

  it("una fecha de antes del viaje se queda donde estabas", () => {
    // Los hoteles pagados en agosto no son de ningún día del viaje.
    expect(diaDeLaFecha(dias, "2026-08-22", "day-1")).toBe("day-1");
  });

  it("sin días no inventa ninguno", () => {
    expect(diaDeLaFecha([], "2026-08-30", null)).toBeNull();
  });
});
