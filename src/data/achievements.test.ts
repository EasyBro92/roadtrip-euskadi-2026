import { describe, expect, it } from "vitest";
import type { Stop } from "../types";
import { logrosDelViaje } from "./achievements.data";

const parada = (id: string, category: Stop["category"]) => ({ id, category, dayId: "d1", enabled: true, visited: false }) as Stop;

describe("logrosDelViaje", () => {
  it("en un viaje sin paradas de Euskadi no salen los logros de Bilbao ni Getaria", () => {
    const ids = logrosDelViaje([parada("x", "cultura")]).map((d) => d.id);
    expect(ids).not.toContain("ach-bilbao-completo");
    expect(ids).not.toContain("ach-rodaballo-getaria");
    expect(ids).toContain("ach-dia-redondo");
  });
  it("en el viaje de Euskadi siguen todos", () => {
    const ids = logrosDelViaje([parada("stop-getaria", "pueblo"), parada("stop-guggenheim", "cultura")]).map((d) => d.id);
    expect(ids).toContain("ach-rodaballo-getaria");
    expect(ids).toContain("ach-bilbao-completo");
  });
});
