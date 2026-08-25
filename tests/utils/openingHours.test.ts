import { describe, expect, it } from "vitest";
import { abreEseDia, estadoDeApertura } from "../../src/utils/openingHours";

// Fechas fijas de referencia (comprobadas): 24/8/2026 lunes, 26/8/2026
// miércoles, 29/8/2026 sábado, 30/8/2026 domingo.
const lunes = (h: number, m = 0) => new Date(2026, 7, 24, h, m);
const miercoles = (h: number, m = 0) => new Date(2026, 7, 26, h, m);
const sabado = (h: number, m = 0) => new Date(2026, 7, 29, h, m);
const domingo = (h: number, m = 0) => new Date(2026, 7, 30, h, m);

describe("estadoDeApertura", () => {
  it("da abierto siempre con 24/7", () => {
    expect(estadoDeApertura("24/7", domingo(3)).estado).toBe("abierto");
  });

  it("abre en horario de oficina un miércoles por la mañana", () => {
    const r = estadoDeApertura("Mo-Fr 09:00-18:00", miercoles(10));
    expect(r).toMatchObject({ estado: "abierto", cierraA: "18:00" });
  });

  it("cuenta cuánto queda para cerrar", () => {
    const r = estadoDeApertura("Mo-Fr 09:00-18:00", miercoles(17, 30));
    expect(r.estado === "abierto" && r.minutosParaCerrar).toBe(30);
  });

  it("está cerrado el sábado y avisa de que abre el lunes", () => {
    const r = estadoDeApertura("Mo-Fr 09:00-18:00", sabado(11));
    expect(r).toMatchObject({ estado: "cerrado", abreA: "09:00", abreDia: "lunes" });
  });

  it("respeta el cierre del mediodía", () => {
    const r = estadoDeApertura("Mo-Fr 09:00-14:00,16:00-20:00", miercoles(15));
    expect(r).toMatchObject({ estado: "cerrado", abreA: "16:00", abreDia: "hoy" });
  });

  it("sigue abierto de madrugada cuando el horario cruza la medianoche", () => {
    // El sábado a la 1:00 el bar sigue en el turno que empezó el viernes.
    const r = estadoDeApertura("Mo-Su 20:00-02:00", sabado(1));
    expect(r).toMatchObject({ estado: "abierto", cierraA: "02:00" });
  });

  it("aplica el cierre semanal de los museos", () => {
    expect(estadoDeApertura("Tu-Su 10:00-20:00; Mo off", lunes(12))).toMatchObject({
      estado: "cerrado",
      abreDia: "mañana",
    });
  });

  it("ignora la regla de festivos pero entiende el resto", () => {
    expect(estadoDeApertura("Mo-Fr 09:00-18:00; PH off", miercoles(10)).estado).toBe("abierto");
  });

  it("dice desconocido ante horarios por temporada", () => {
    expect(estadoDeApertura("Apr-Sep Mo-Su 10:00-20:00", miercoles(12)).estado).toBe("desconocido");
  });

  it("dice desconocido ante sintaxis que no cubrimos", () => {
    // Preferimos callar antes que arriesgarnos a mandar a alguien a un sitio cerrado.
    for (const raro of ["sunrise-sunset", "Mo[1] 10:00-14:00", "week 1-53 Mo 10:00-12:00", "abierto por las tardes"]) {
      expect(estadoDeApertura(raro, miercoles(12)).estado).toBe("desconocido");
    }
  });

  it("dice desconocido cuando no hay horario", () => {
    expect(estadoDeApertura(undefined, miercoles(12)).estado).toBe("desconocido");
    expect(estadoDeApertura("", miercoles(12)).estado).toBe("desconocido");
  });
});

/*
 * Horario real del Museo Guggenheim, tal cual está publicado en
 * OpenStreetMap. Casi todos los museos llevan excepciones por fecha como
 * estas, y antes tiraban por tierra el horario entero.
 */
const GUGGENHEIM = "Tu-Su 10:00-19:30; Mo off; Dec 24,Dec 31: 10:00-17:00; Dec 25,Jan 01: off";

describe("excepciones por fecha", () => {
  it("lee el horario normal sin que las fechas sueltas lo estropeen", () => {
    expect(estadoDeApertura(GUGGENHEIM, miercoles(12))).toMatchObject({ estado: "abierto", cierraA: "19:30" });
  });

  it("sigue respetando el cierre de los lunes", () => {
    expect(estadoDeApertura(GUGGENHEIM, lunes(12)).estado).toBe("cerrado");
  });

  it("aplica el horario reducido de Nochebuena", () => {
    // 24/12/2026 es jueves: en horario normal cerraría a las 19:30.
    expect(estadoDeApertura(GUGGENHEIM, new Date(2026, 11, 24, 16))).toMatchObject({ estado: "abierto", cierraA: "17:00" });
    expect(estadoDeApertura(GUGGENHEIM, new Date(2026, 11, 24, 18)).estado).toBe("cerrado");
  });

  it("cierra en Navidad aunque sea un viernes normal", () => {
    expect(estadoDeApertura(GUGGENHEIM, new Date(2026, 11, 25, 12)).estado).toBe("cerrado");
    expect(abreEseDia(GUGGENHEIM, new Date(2026, 11, 25, 12))).toBe(false);
  });

  it("no confunde el 24 de agosto con el 24 de diciembre", () => {
    expect(abreEseDia(GUGGENHEIM, new Date(2026, 7, 26, 12))).toBe(true);
  });

  it("sigue diciendo desconocido si la excepción trae algo raro", () => {
    expect(estadoDeApertura("Mo-Su 10:00-20:00; Dec 25: sunrise-sunset", new Date(2026, 11, 25, 12)).estado).toBe("desconocido");
  });
});

describe("abreEseDia", () => {
  it("sabe que un museo cerrado los lunes no abre ese día", () => {
    expect(abreEseDia("Tu-Su 10:00-20:00; Mo off", lunes(12))).toBe(false);
    expect(abreEseDia("Tu-Su 10:00-20:00; Mo off", miercoles(12))).toBe(true);
  });

  it("entiende los rangos que dan la vuelta a la semana", () => {
    expect(abreEseDia("Sa-Su 10:00-14:00", domingo(11))).toBe(true);
    expect(abreEseDia("Sa-Su 10:00-14:00", miercoles(11))).toBe(false);
  });

  it("devuelve null, no false, cuando no entiende el horario", () => {
    // null y false significan cosas distintas: "no lo sé" frente a "cierra".
    expect(abreEseDia("sunrise-sunset", lunes(12))).toBeNull();
    expect(abreEseDia(undefined, lunes(12))).toBeNull();
  });
});
