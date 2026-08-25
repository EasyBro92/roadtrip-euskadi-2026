import { describe, expect, it } from "vitest";
import { parecido } from "../../src/services/places/PlaceDetailsService";

/*
 * Overpass devuelve todo lo que hay en 150 metros. Al lado del Guggenheim hay
 * una cafetería, un puente y una escultura: elegir mal significa enseñar el
 * horario del bar de enfrente, que es peor que no enseñar nada.
 */
describe("parecido entre nombres", () => {
  it("reconoce el mismo sitio escrito igual", () => {
    expect(parecido("Museo Guggenheim", "Museo Guggenheim")).toBe(1);
  });

  it("ignora acentos y mayúsculas", () => {
    expect(parecido("Catedral de Santa María", "CATEDRAL DE SANTA MARIA")).toBe(1);
  });

  it("no confunde el museo con el bar de al lado", () => {
    expect(parecido("Museo Guggenheim", "Cafetería Ondarreta")).toBeLessThan(0.5);
  });

  it("aguanta la puntuación y los artículos cortos", () => {
    expect(parecido("Playa de La Concha", "Playa Concha")).toBeGreaterThanOrEqual(0.5);
  });

  it("da cero cuando no hay nada que comparar", () => {
    expect(parecido("", "Museo Guggenheim")).toBe(0);
    expect(parecido("de la el", "un o y")).toBe(0);
  });

  it("no da por bueno un parecido flojo", () => {
    // Comparten "san" pero son sitios distintos; debe quedar por debajo del
    // umbral de 0,5 que usa el servicio para aceptar una coincidencia.
    expect(parecido("San Sebastián", "San Telmo Museoa")).toBeLessThan(0.5);
  });
});
