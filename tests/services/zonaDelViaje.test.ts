import { describe, expect, it } from "vitest";
import { recuadroDe, textoRecuadro } from "../../src/services/geocoding/zonaDelViaje";

const BILBAO = { latitude: 43.263, longitude: -2.935 };
const SAN_SEBASTIAN = { latitude: 43.318, longitude: -1.981 };

describe("recuadroDe", () => {
  it("sin coordenadas no hay zona", () => {
    // Un viaje recién creado se busca en todo el mundo, que es lo correcto.
    expect(recuadroDe([])).toBeNull();
  });

  it("abarca todas las paradas", () => {
    const r = recuadroDe([BILBAO, SAN_SEBASTIAN])!;

    expect(r.oeste).toBeLessThan(BILBAO.longitude);
    expect(r.este).toBeGreaterThan(SAN_SEBASTIAN.longitude);
    expect(r.sur).toBeLessThan(BILBAO.latitude);
    expect(r.norte).toBeGreaterThan(SAN_SEBASTIAN.latitude);
  });

  it("deja margen alrededor, para que lo de al lado también cuente como cerca", () => {
    const r = recuadroDe([BILBAO])!;
    expect(r.este - r.oeste).toBeCloseTo(1, 5);
    expect(r.norte - r.sur).toBeCloseTo(1, 5);
  });

  it("una sola parada ya da zona", () => {
    expect(recuadroDe([BILBAO])).not.toBeNull();
  });

  it("no se sale del mapa", () => {
    const r = recuadroDe([{ latitude: 89.9, longitude: 179.9 }])!;
    expect(r.norte).toBeLessThanOrEqual(90);
    expect(r.este).toBeLessThanOrEqual(180);

    const r2 = recuadroDe([{ latitude: -89.9, longitude: -179.9 }])!;
    expect(r2.sur).toBeGreaterThanOrEqual(-90);
    expect(r2.oeste).toBeGreaterThanOrEqual(-180);
  });

  it("ignora coordenadas corruptas", () => {
    // Un NaN colado desde una importación no debe convertir la zona en NaN.
    const r = recuadroDe([{ latitude: Number.NaN, longitude: Number.NaN }, BILBAO])!;
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.oeste)).toBe(true);
    expect(Number.isFinite(r.norte)).toBe(true);
  });

  it("si TODAS son corruptas, no hay zona", () => {
    expect(recuadroDe([{ latitude: Number.NaN, longitude: 0 / 0 }])).toBeNull();
  });
});

describe("textoRecuadro", () => {
  it("da el orden que espera Nominatim: oeste, norte, este, sur", () => {
    expect(textoRecuadro({ oeste: -3.5, norte: 43.8, este: -1.4, sur: 42.7 })).toBe("-3.50,43.80,-1.40,42.70");
  });

  it("redondea, para que mover una parada cien metros no estrene caché", () => {
    const a = textoRecuadro({ oeste: -3.5001, norte: 43.8001, este: -1.4001, sur: 42.7001 });
    const b = textoRecuadro({ oeste: -3.5002, norte: 43.8002, este: -1.4002, sur: 42.7002 });
    expect(a).toBe(b);
  });
});
