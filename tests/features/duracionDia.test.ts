import { describe, expect, it } from "vitest";
import { duracionDelDia } from "../../src/features/itinerary/duracionDia";
import type { Stop } from "../../src/types";

/** Una parada en unas coordenadas concretas, con lo que se tarda en verla. */
function parada(lat: number, lon: number, minutos: number, extra: Partial<Stop> = {}): Stop {
  return {
    id: `${lat}-${lon}-${minutos}`,
    name: "Parada",
    coordinates: { latitude: lat, longitude: lon },
    recommendedDurationMinutes: minutos,
    enabled: true,
    ...extra,
  } as Stop;
}

describe("duracionDelDia", () => {
  it("suma las visitas y el camino entre ellas", () => {
    // Dos sitios de Bilbao a 300 m: se va andando y son minutos.
    const d = duracionDelDia([parada(43.256, -2.923, 60), parada(43.259, -2.923, 30)]);

    expect(d.minutosVisitas).toBe(90);
    expect(d.minutosCamino).toBeGreaterThan(0);
    expect(d.minutosCamino).toBeLessThan(15);
    expect(d.minutosTotales).toBe(d.minutosVisitas + d.minutosCamino);
  });

  it("no cuenta las paradas desactivadas", () => {
    const d = duracionDelDia([parada(43.256, -2.923, 60), parada(43.259, -2.923, 30, { enabled: false })]);
    expect(d.minutosVisitas).toBe(60);
    expect(d.minutosCamino).toBe(0);
  });

  it("un día de casco viejo cabe de sobra", () => {
    // Nueve paradas pegadas: muchas paradas, pocas horas. Contando paradas
    // esto saltaba como sobrecargado, y es una mañana andando.
    const stops = Array.from({ length: 9 }, (_, i) => parada(43.256 + i * 0.002, -2.923, 30));
    const d = duracionDelDia(stops);

    expect(d.minutosTotales).toBeLessThan(10 * 60);
    expect(d.nivel).toBe("holgado");
  });

  it("avisa cuando el día no cabe", () => {
    /*
     * El caso real: doce paradas repartidas entre Gaztelugatxe y Hondarribia,
     * con once horas sólo de visitas. Son las horas las que no caben, no los
     * sitios.
     */
    const stops = [
      parada(43.446, -2.785, 120), // Gaztelugatxe
      parada(43.304, -2.201, 120), // Getaria
      parada(43.297, -2.257, 135), // Zumaia
      parada(43.301, -1.973, 155), // San Sebastián
      parada(43.363, -1.795, 45), // Hondarribia
      parada(43.323, -1.985, 90), // vuelta a la Parte Vieja
    ];
    const d = duracionDelDia(stops);

    expect(d.minutosTotales).toBeGreaterThan(12 * 60);
    expect(d.nivel).toBe("imposible");
  });

  it("un día vacío no dura nada", () => {
    expect(duracionDelDia([])).toMatchObject({ minutosTotales: 0, minutosVisitas: 0, minutosCamino: 0 });
  });
});
