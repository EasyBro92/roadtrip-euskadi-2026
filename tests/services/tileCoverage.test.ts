import { describe, expect, it } from "vitest";
import { teselaDe, teselasDeRuta, urlDeTesela } from "../../src/services/offline/tileCoverage";

const GIRONA = { latitude: 41.9794, longitude: 2.8214 };
const BILBAO = { latitude: 43.263, longitude: -2.935 };

describe("teselaDe", () => {
  it("coloca el meridiano cero y el ecuador en la esquina del centro", () => {
    // A zoom 1 el mundo son 2x2 teselas: el punto (0,0) cae en la (1,1).
    expect(teselaDe({ latitude: 0, longitude: 0 }, 1)).toEqual({ z: 1, x: 1, y: 1 });
  });

  it("da los valores de la fórmula estándar para Girona y Bilbao", () => {
    // Calculados aparte con la fórmula de Web Mercator, no con esta función.
    expect(teselaDe(GIRONA, 12)).toEqual({ z: 12, x: 2080, y: 1520 });
    expect(teselaDe(BILBAO, 12)).toEqual({ z: 12, x: 2014, y: 1500 });
  });

  it("no se sale del mundo en los polos", () => {
    const norte = teselaDe({ latitude: 89.9, longitude: 0 }, 5);
    const sur = teselaDe({ latitude: -89.9, longitude: 0 }, 5);

    expect(norte.y).toBeGreaterThanOrEqual(0);
    expect(sur.y).toBeLessThan(2 ** 5);
  });

  it("a más zoom, más teselas para el mismo punto", () => {
    expect(teselaDe(GIRONA, 14).x).toBeGreaterThan(teselaDe(GIRONA, 12).x);
  });
});

describe("teselasDeRuta", () => {
  it("no devuelve nada sin puntos", () => {
    expect(teselasDeRuta([], 12)).toEqual([]);
  });

  it("cubre el trayecto entero, no sólo las dos puntas", () => {
    // Girona-Bilbao son ~500 km: si sólo mirase las puntas diría que un
    // trayecto está listo sin conexión teniendo el medio en blanco.
    const teselas = teselasDeRuta([GIRONA, BILBAO], 11);
    const xs = teselas.map((t) => t.x);

    expect(teselas.length).toBeGreaterThan(50);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10);
  });

  it("no repite teselas", () => {
    const teselas = teselasDeRuta([GIRONA, GIRONA, GIRONA], 12);
    const claves = new Set(teselas.map((t) => `${t.z}/${t.x}/${t.y}`));

    expect(claves.size).toBe(teselas.length);
  });

  it("añade el margen alrededor del punto", () => {
    // Con margen 1 son las 9 de un cuadrado 3x3 alrededor.
    expect(teselasDeRuta([GIRONA], 12, 1)).toHaveLength(9);
    expect(teselasDeRuta([GIRONA], 12, 0)).toHaveLength(1);
  });
});

describe("urlDeTesela", () => {
  it("rellena la plantilla de un proveedor con subdominios", () => {
    const url = urlDeTesela("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { z: 12, x: 2080, y: 1553 }, "b");
    expect(url).toBe("https://b.tile.openstreetmap.org/12/2080/1553.png");
  });

  it("quita el sufijo de pantalla retina, que no siempre existe", () => {
    const url = urlDeTesela("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { z: 5, x: 1, y: 2 });
    expect(url).toBe("https://a.basemaps.cartocdn.com/light_all/5/1/2.png");
  });
});
