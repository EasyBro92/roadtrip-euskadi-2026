import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";
import { fechaLocal } from "../../src/utils/format";

beforeEach(() => {
  useTripStore.getState().resetAllData();
});

const dias = () => useTripStore.getState().trip.days;

describe("updateDay", () => {
  it("stores the title and the city", () => {
    const id = dias()[0].id;
    useTripStore.getState().updateDay(id, { title: "Llegada", city: "Girona" });

    const dia = dias().find((d) => d.id === id)!;
    expect(dia.title).toBe("Llegada");
    expect(dia.city).toBe("Girona");
  });

  it("leaves the other days alone", () => {
    const antes = dias()[1].title;
    useTripStore.getState().updateDay(dias()[0].id, { title: "Cambiado" });
    expect(dias()[1].title).toBe(antes);
  });
});

describe("reorderDays", () => {
  it("moves a day with its stops", () => {
    const [d1, d2] = dias();
    const paradasDe2 = [...d2.stopIds];

    useTripStore.getState().reorderDays([d2.id, d1.id, ...dias().slice(2).map((d) => d.id)]);

    const nuevos = dias();
    expect(nuevos[0].id).toBe(d2.id);
    expect(nuevos[0].stopIds).toEqual(paradasDe2);
    expect(nuevos[1].id).toBe(d1.id);
  });

  it("keeps the dates as fixed slots in ascending order", () => {
    const fechasAntes = dias().map((d) => d.date);
    const orden = dias().map((d) => d.id);
    [orden[0], orden[1]] = [orden[1], orden[0]];

    useTripStore.getState().reorderDays(orden);

    // Las fechas no viajan con el día: siguen igual y en el mismo orden.
    expect(dias().map((d) => d.date)).toEqual(fechasAntes);
  });

  it("re-dates the stops that moved, so none is left on the wrong day", () => {
    const orden = dias().map((d) => d.id);
    [orden[0], orden[1]] = [orden[1], orden[0]];

    useTripStore.getState().reorderDays(orden);

    const { stopsById } = useTripStore.getState();
    for (const dia of dias()) {
      for (const stopId of dia.stopIds) {
        expect(stopsById[stopId].date, `${stopsById[stopId].name}`).toBe(dia.date);
      }
    }
  });

  it("renumbers the days so index follows position", () => {
    const orden = dias().map((d) => d.id).reverse();
    useTripStore.getState().reorderDays(orden);
    expect(dias().map((d) => d.index)).toEqual(dias().map((_, i) => i));
  });

  it("ignores an incomplete list rather than losing a day", () => {
    const antes = dias().map((d) => d.id);
    useTripStore.getState().reorderDays([antes[0]]);
    expect(dias().map((d) => d.id)).toEqual(antes);
  });
});

describe("sincronizarDiaDeHoy", () => {
  it("abre en el día del viaje que toca hoy", () => {
    /*
     * El día actual sólo cambiaba a mano, así que el segundo día del viaje la
     * app seguía abriendo en el primero y los gastos nuevos se apuntaban al
     * día equivocado.
     */
    const [d1, d2] = dias();
    useTripStore.getState().updateDay(d2.id, { date: fechaLocal() });
    useTripStore.getState().setCurrentDay(d1.id);

    useTripStore.getState().sincronizarDiaDeHoy();
    expect(useTripStore.getState().trip.currentDayId).toBe(d2.id);
  });

  it("no toca nada si hoy no es del viaje", () => {
    // Antes de salir, o al volver: se queda donde lo dejaste.
    const [d1] = dias();
    useTripStore.getState().setCurrentDay(d1.id);
    for (const d of dias()) useTripStore.getState().updateDay(d.id, { date: "1999-01-01" });

    useTripStore.getState().sincronizarDiaDeHoy();
    expect(useTripStore.getState().trip.currentDayId).toBe(d1.id);
  });
});
