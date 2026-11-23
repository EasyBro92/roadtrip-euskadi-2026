import { describe, expect, it } from "vitest";
import { pantallasQueCoinciden } from "./pantallasDeLaApp";

describe("pantallasQueCoinciden", () => {
  it("lleva a Dónde dormir al escribir hotel", () => {
    expect(pantallasQueCoinciden("hotel").map((p) => p.ruta)).toContain("/mas/dormir");
  });
  it("no sugiere nada con menos de tres letras", () => {
    expect(pantallasQueCoinciden("ga")).toEqual([]);
  });
  it("encuentra gastos por una palabra a medias", () => {
    expect(pantallasQueCoinciden("gast")[0]?.ruta).toBe("/gastos");
  });
});
