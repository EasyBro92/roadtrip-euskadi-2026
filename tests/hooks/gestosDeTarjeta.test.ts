import { describe, expect, it } from "vitest";
import { debeCerrarse, opacidadDelVelo } from "../../src/hooks/useGestosDeTarjeta";

describe("debeCerrarse", () => {
  it("un arrastre largo cierra, por lento que sea", () => {
    expect(debeCerrarse(160, 900)).toBe(true);
  });

  it("un arrastre corto y lento vuelve a su sitio", () => {
    // 60 px en 160 ms: has cambiado de idea, no la estás descartando.
    expect(debeCerrarse(60, 160)).toBe(false);
  });

  it("un golpe seco cierra aunque no llegue al umbral de distancia", () => {
    // 70 px en 60 ms: corto, pero decidido.
    expect(debeCerrarse(70, 60)).toBe(true);
  });

  it("un toque con temblor NO cierra, por rápido que salga", () => {
    /*
     * Éste es el que se coló: 10 px en 15 ms da una velocidad enorme y
     * cerraba la ficha recién abierta. Es el caso que obliga a exigirle
     * también un recorrido mínimo al golpe.
     */
    expect(debeCerrarse(10, 15)).toBe(false);
    expect(debeCerrarse(39, 10)).toBe(false);
  });

  it("no cierra sin movimiento, ni con tiempo cero", () => {
    expect(debeCerrarse(0, 0)).toBe(false);
    expect(debeCerrarse(0, 500)).toBe(false);
  });

  it("justo por encima del recorrido mínimo y rápido, cierra", () => {
    expect(debeCerrarse(41, 10)).toBe(true);
  });
});

describe("opacidadDelVelo", () => {
  it("empieza opaco del todo", () => {
    expect(opacidadDelVelo(0)).toBe(1);
  });

  it("se aclara según baja la tarjeta", () => {
    expect(opacidadDelVelo(200)).toBeLessThan(1);
    expect(opacidadDelVelo(200)).toBeGreaterThan(opacidadDelVelo(400));
  });

  it("nunca se va del todo, para que soltar a medias no dé un parpadeo", () => {
    expect(opacidadDelVelo(5000)).toBeGreaterThanOrEqual(0.45);
  });
});
