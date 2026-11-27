import { describe, expect, it } from "vitest";
import { claseDeTransicion } from "./direccion";

describe("claseDeTransicion", () => {
  it("de Gastos al Mapa vuelve desde la izquierda", () => {
    expect(claseDeTransicion("/mapa", "PUSH", { tabDesde: 3 })).toBe("pantalla-vuelve");
  });
  it("del Mapa a Gastos avanza", () => {
    expect(claseDeTransicion("/gastos", "PUSH", { tabDesde: 0 })).toBe("pantalla-avanza");
  });
  it("el botón atrás vuelve", () => {
    expect(claseDeTransicion("/mas/dormir", "POP", null)).toBe("pantalla-vuelve");
  });
});
