import { describe, expect, it } from "vitest";
import { resumirCierres, type Sabido } from "../../src/hooks/useDayClosures";
import type { Stop } from "../../src/types";

/** Horario real del Museo Guggenheim en OpenStreetMap: cierra los lunes. */
const CIERRA_LUNES = "Tu-Su 10:00-19:30; Mo off; Dec 24,Dec 31: 10:00-17:00; Dec 25,Jan 01: off";

const LUNES = "2026-08-24";
const MARTES = "2026-08-25";

function parada(id: string, extra: Partial<Stop> = {}): Stop {
  return { id, name: id, enabled: true, ...extra } as Stop;
}

const nada: Record<string, Sabido> = {};

describe("resumirCierres", () => {
  it("avisa de la parada que ese día no abre", () => {
    const sabido = { guggenheim: { comprobado: true, horario: CIERRA_LUNES } };
    const r = resumirCierres([parada("guggenheim")], sabido, LUNES);

    expect(r.cerradas.map((c) => c.nombre)).toEqual(["guggenheim"]);
    expect(r.sinHorario).toBe(0);
  });

  it("no avisa el día que sí abre", () => {
    const sabido = { guggenheim: { comprobado: true, horario: CIERRA_LUNES } };
    expect(resumirCierres([parada("guggenheim")], sabido, MARTES).cerradas).toHaveLength(0);
  });

  it("da prioridad al horario que escribiste tú sobre el de OpenStreetMap", () => {
    // Tú sabes que ese lunes abre; el mapa dice que no. Manda lo tuyo.
    const sabido = { museo: { comprobado: true, horario: CIERRA_LUNES } };
    const r = resumirCierres([parada("museo", { openingHours: "Mo-Su 10:00-20:00" })], sabido, LUNES);

    expect(r.cerradas).toHaveLength(0);
  });

  it("separa lo no consultado de lo consultado sin suerte", () => {
    const sabido = { preguntada: { comprobado: true } }; // se preguntó, no había horario
    const r = resumirCierres([parada("preguntada"), parada("virgen")], sabido, LUNES);

    expect(r.sinHorario).toBe(1);
    expect(r.sinComprobar).toBe(1);
  });

  it("cuenta como no consultada la parada de la que no sabemos nada", () => {
    const r = resumirCierres([parada("mirador")], nada, LUNES);
    expect(r).toMatchObject({ sinComprobar: 1, sinHorario: 0, cerradas: [] });
  });

  it("ignora las paradas desactivadas", () => {
    const sabido = { guggenheim: { comprobado: true, horario: CIERRA_LUNES } };
    const r = resumirCierres([parada("guggenheim", { enabled: false })], sabido, LUNES);

    expect(r).toMatchObject({ cerradas: [], sinComprobar: 0, sinHorario: 0 });
  });

  it("nunca da por cerrada una parada cuyo horario no entiende", () => {
    // "no lo sé" y "cierra" son cosas distintas, y confundirlas manda a alguien
    // a un sitio cerrado o le hace cambiar el plan sin motivo.
    const sabido = { raro: { comprobado: true, horario: "sunrise-sunset" } };
    const r = resumirCierres([parada("raro")], sabido, LUNES);

    expect(r.cerradas).toHaveLength(0);
    expect(r.sinHorario).toBe(1);
  });

  it("lista varias paradas cerradas el mismo día", () => {
    const sabido = {
      a: { comprobado: true, horario: CIERRA_LUNES },
      b: { comprobado: true, horario: "Tu-Su 09:00-14:00" },
    };
    const r = resumirCierres([parada("a"), parada("b"), parada("c")], sabido, LUNES);

    expect(r.cerradas.map((c) => c.nombre)).toEqual(["a", "b"]);
    expect(r.sinComprobar).toBe(1);
  });
});
