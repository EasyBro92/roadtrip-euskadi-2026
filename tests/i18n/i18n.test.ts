import { describe, expect, it } from "vitest";
import { detectarIdioma, resolverIdioma, traducir } from "../../src/i18n";

describe("traducir", () => {
  it("traduce lo que está en el diccionario", () => {
    expect(traducir("Mis viajes", "en")).toBe("My trips");
  });

  it("devuelve el castellano cuando falta la traducción", () => {
    // Es la clave del asunto: una pantalla sin traducir se lee igual, no se
    // queda en blanco ni enseña un identificador.
    expect(traducir("Una frase que nadie ha traducido", "en")).toBe("Una frase que nadie ha traducido");
  });

  it("en castellano devuelve la clave tal cual, que es el original", () => {
    expect(traducir("Mis viajes", "es")).toBe("Mis viajes");
  });

  it("rellena los huecos con nombre", () => {
    expect(traducir("{n} paradas", "en", { n: 12 })).toBe("12 stops");
  });

  it("deja el hueco si no le das el valor", () => {
    expect(traducir("{n} paradas", "en")).toBe("{n} stops");
  });

  it("rellena varios huecos", () => {
    expect(traducir("noche {n} de {total}", "en", { n: 2, total: 3 })).toBe("night 2 of 3");
  });
});

describe("resolverIdioma", () => {
  it("respeta el idioma elegido a mano", () => {
    expect(resolverIdioma("en")).toBe("en");
    expect(resolverIdioma("es")).toBe("es");
  });

  it("con automático usa el del navegador", () => {
    expect(resolverIdioma("auto")).toBe(detectarIdioma());
  });
});

describe("detectarIdioma", () => {
  it("devuelve siempre un idioma que existe", () => {
    // Un móvil en alemán no debe dejar la app sin idioma: cae en castellano.
    expect(["es", "en"]).toContain(detectarIdioma());
  });
});
