import { describe, expect, it } from "vitest";
import { nochesPorDia, nochesSinAlojamiento } from "../../src/features/itinerary/alojamiento";
import type { Stop, TripDay } from "../../src/types";

/** Construye días y paradas a partir de una lista de nombres de hotel por día. */
function viaje(hotelesPorDia: (string | null)[]) {
  const stopsById: Record<string, Stop> = {};
  const days: TripDay[] = hotelesPorDia.map((hotel, i) => {
    const stopIds: string[] = [`museo-${i}`];
    stopsById[`museo-${i}`] = { id: `museo-${i}`, name: "Museo", category: "cultura", enabled: true } as Stop;

    if (hotel) {
      const id = `hotel-${i}`;
      stopsById[id] = { id, name: hotel, category: "hotel", enabled: true } as Stop;
      stopIds.push(id);
    }
    return { id: `day-${i + 1}`, stopIds } as TripDay;
  });
  return { days, stopsById };
}

describe("nochesPorDia", () => {
  it("agrupa las noches seguidas en el mismo hotel", () => {
    // El caso real del viaje: el mismo hotel repetido en dos días parece dos
    // reservas distintas cuando es una estancia de dos noches.
    const { days, stopsById } = viaje(["Hotel Pedro I", "Conde Duque", "Conde Duque", null]);
    const noches = nochesPorDia(days, stopsById);

    expect(noches.map((n) => `${n.numeroDeNoche}/${n.totalNoches}`)).toEqual(["1/1", "1/2", "2/2", "1/1"]);
  });

  it("no agrupa el mismo hotel en días no consecutivos", () => {
    // Bilbao, Santander, y vuelta a Bilbao: son dos estancias, no una de tres.
    const { days, stopsById } = viaje(["Conde Duque", "Otro", "Conde Duque"]);
    const noches = nochesPorDia(days, stopsById);

    expect(noches.map((n) => n.totalNoches)).toEqual([1, 1, 1]);
  });

  it("ignora mayúsculas y espacios de más al comparar", () => {
    const { days, stopsById } = viaje(["Conde  Duque", "conde duque "]);
    expect(nochesPorDia(days, stopsById)[0].totalNoches).toBe(2);
  });

  it("deja sin hotel los días que no tienen", () => {
    const { days, stopsById } = viaje([null, "Conde Duque"]);
    const noches = nochesPorDia(days, stopsById);

    expect(noches[0].nombre).toBeNull();
    expect(noches[1].nombre).toBe("Conde Duque");
  });

  it("no cuenta un hotel desactivado", () => {
    const { days, stopsById } = viaje(["Conde Duque"]);
    stopsById["hotel-0"].enabled = false;

    expect(nochesPorDia(days, stopsById)[0].nombre).toBeNull();
  });

  it("aguanta un viaje de un solo día", () => {
    const { days, stopsById } = viaje(["Conde Duque"]);
    expect(nochesPorDia(days, stopsById)).toHaveLength(1);
  });
});

describe("nochesSinAlojamiento", () => {
  it("avisa de la noche que se quedó sin hotel", () => {
    const { days, stopsById } = viaje(["Conde Duque", null, "Bretxa", null]);
    const sin = nochesSinAlojamiento(nochesPorDia(days, stopsById));

    expect(sin.map((n) => n.dayId)).toEqual(["day-2"]);
  });

  it("no cuenta el último día, que es el de volver a casa", () => {
    const { days, stopsById } = viaje(["Conde Duque", "Bretxa", null]);
    expect(nochesSinAlojamiento(nochesPorDia(days, stopsById))).toHaveLength(0);
  });

  it("no avisa cuando todas las noches están cubiertas", () => {
    const { days, stopsById } = viaje(["A", "B", null]);
    expect(nochesSinAlojamiento(nochesPorDia(days, stopsById))).toEqual([]);
  });
});

describe("dos alojamientos el mismo día", () => {
  it("señala el que sobra en vez de callárselo", () => {
    // El caso real del viaje: la Pensión Bretxa acabó en el día 2, junto al
    // hotel de Zaragoza, y el día 5 se quedó sin nada. Quedarse con el
    // primero y callar deja el fallo escondido.
    const stopsById: Record<string, Stop> = {
      "h-a": { id: "h-a", name: "Hotel Zaragoza Plaza", category: "hotel", enabled: true } as Stop,
      "h-b": { id: "h-b", name: "Pensión Bretxa", category: "hotel", enabled: true } as Stop,
    };
    const days = [{ id: "day-1", stopIds: ["h-a", "h-b"] }, { id: "day-2", stopIds: [] }] as TripDay[];

    const noches = nochesPorDia(days, stopsById);

    expect(noches[0].nombre).toBe("Hotel Zaragoza Plaza");
    expect(noches[0].sobrantes).toEqual(["Pensión Bretxa"]);
  });

  it("no inventa sobrantes cuando sólo hay uno", () => {
    const { days, stopsById } = viaje(["Conde Duque", null]);
    expect(nochesPorDia(days, stopsById)[0].sobrantes).toEqual([]);
  });
});
