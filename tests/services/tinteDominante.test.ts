import { describe, expect, it } from "vitest";
import { rgbAHsl, tinteDominante } from "../../src/services/color/tinteDominante";

/** Un mapa de píxeles RGBA a partir de una lista de colores. */
function pixeles(colores: [number, number, number][], alfa = 255): Uint8ClampedArray {
  const datos = new Uint8ClampedArray(colores.length * 4);
  colores.forEach(([r, g, b], i) => {
    datos[i * 4] = r;
    datos[i * 4 + 1] = g;
    datos[i * 4 + 2] = b;
    datos[i * 4 + 3] = alfa;
  });
  return datos;
}

/** Repite un color n veces, para simular "media foto de este tono". */
function repetir(color: [number, number, number], veces: number): [number, number, number][] {
  return Array.from({ length: veces }, () => color);
}

const ROJO: [number, number, number] = [220, 30, 30];
const AZUL_MAR: [number, number, number] = [20, 90, 200];
const GRIS: [number, number, number] = [128, 130, 127];
const BLANCO: [number, number, number] = [252, 252, 252];
const NEGRO: [number, number, number] = [4, 4, 6];

describe("rgbAHsl", () => {
  it("convierte los primarios", () => {
    expect(rgbAHsl(255, 0, 0).h).toBeCloseTo(0);
    expect(rgbAHsl(0, 255, 0).h).toBeCloseTo(120);
    expect(rgbAHsl(0, 0, 255).h).toBeCloseTo(240);
  });

  it("un gris no tiene tono ni saturación", () => {
    const { s, l } = rgbAHsl(128, 128, 128);
    expect(s).toBe(0);
    expect(l).toBeCloseTo(50.2, 0);
  });
});

describe("tinteDominante", () => {
  it("saca el tono de una foto de un solo color", () => {
    const tinte = tinteDominante(pixeles(repetir(AZUL_MAR, 20)));
    expect(tinte).not.toBeNull();
    // El azul de ese RGB cae sobre los 220°.
    expect(tinte!.h).toBeGreaterThan(200);
    expect(tinte!.h).toBeLessThan(240);
  });

  it("devuelve null si la foto no tiene color", () => {
    expect(tinteDominante(pixeles([...repetir(GRIS, 10), ...repetir(BLANCO, 10), ...repetir(NEGRO, 10)]))).toBeNull();
  });

  it("devuelve null con un mapa vacío", () => {
    expect(tinteDominante(new Uint8ClampedArray(0))).toBeNull();
  });

  it("ignora los píxeles transparentes", () => {
    expect(tinteDominante(pixeles(repetir(ROJO, 20), 0))).toBeNull();
  });

  it("un trozo de color intenso gana a mucho gris apagado", () => {
    // Es lo que hace reconocible la tarjeta: el ojo recuerda el mar, no el asfalto.
    const tinte = tinteDominante(pixeles([...repetir(GRIS, 90), ...repetir(AZUL_MAR, 10)]));
    expect(tinte).not.toBeNull();
    expect(tinte!.h).toBeGreaterThan(200);
    expect(tinte!.h).toBeLessThan(240);
  });

  it("elige el más presente cuando hay dos colores de verdad", () => {
    const tinte = tinteDominante(pixeles([...repetir(ROJO, 80), ...repetir(AZUL_MAR, 20)]));
    expect(tinte).not.toBeNull();
    expect(tinte!.h < 20 || tinte!.h > 340).toBe(true);
  });

  it("promedia los tonos en círculo, sin cruzar por el verde", () => {
    /*
     * 355° y 5° son los dos rojos. Con una media aritmética saldría 180°
     * —verde— que es justo el color que no hay en la foto.
     */
    const casiRojoPorDebajo: [number, number, number] = [220, 30, 40];
    const casiRojoPorEncima: [number, number, number] = [220, 40, 30];
    const tinte = tinteDominante(pixeles([...repetir(casiRojoPorDebajo, 20), ...repetir(casiRojoPorEncima, 20)]));
    expect(tinte).not.toBeNull();
    expect(tinte!.h < 20 || tinte!.h > 340).toBe(true);
  });

  it("mantiene la saturación en un rango usable", () => {
    // Ni un tono lavado invisible, ni un neón que se coma la foto.
    const apagado = tinteDominante(pixeles(repetir([140, 120, 100], 20)));
    const neon = tinteDominante(pixeles(repetir([255, 0, 255], 20)));
    for (const tinte of [apagado, neon]) {
      if (!tinte) continue;
      expect(tinte.s).toBeGreaterThanOrEqual(45);
      expect(tinte.s).toBeLessThanOrEqual(70);
    }
  });
});
