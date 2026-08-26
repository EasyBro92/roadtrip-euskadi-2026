import { describe, expect, it } from "vitest";
import { describirTiempo, hayPrevisionPara } from "../../src/services/weather/WeatherService";

describe("describirTiempo", () => {
  it("traduce los códigos que no son lluvia", () => {
    expect(describirTiempo(0)).toEqual({ texto: "Despejado", lluvia: false });
    expect(describirTiempo(3)).toEqual({ texto: "Nublado", lluvia: false });
    expect(describirTiempo(45)).toMatchObject({ texto: "Niebla", lluvia: false });
  });

  it("marca como lluvia lo que moja", () => {
    // 61 es lluvia ligera, 80 chubascos, 95 tormenta.
    for (const codigo of [51, 61, 80, 95]) {
      expect(describirTiempo(codigo).lluvia).toBe(true);
    }
  });

  it("agrupa los grados de intensidad en una sola palabra", () => {
    // Entre "llovizna ligera" y "llovizna moderada" no cambia el plan de nadie.
    expect(describirTiempo(51).texto).toBe(describirTiempo(55).texto);
  });

  it("no se rompe con un código desconocido", () => {
    expect(describirTiempo(500).texto).toBe("Sin datos");
  });
});

describe("hayPrevisionPara", () => {
  const hoy = new Date(2026, 7, 26, 12); // 26/08/2026

  it("acepta hoy y los próximos catorce días", () => {
    expect(hayPrevisionPara("2026-08-26", hoy)).toBe(true);
    expect(hayPrevisionPara("2026-09-02", hoy)).toBe(true);
    expect(hayPrevisionPara("2026-09-09", hoy)).toBe(true);
  });

  it("rechaza lo que está más allá de la ventana", () => {
    // Un viaje a un mes vista no tiene previsión: fingirla sería mentir.
    expect(hayPrevisionPara("2026-10-15", hoy)).toBe(false);
  });

  it("rechaza el pasado, salvo el día de ayer por el desfase horario", () => {
    expect(hayPrevisionPara("2026-08-25", hoy)).toBe(true);
    expect(hayPrevisionPara("2026-08-20", hoy)).toBe(false);
  });
});
