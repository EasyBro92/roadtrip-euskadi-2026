/**
 * Lectura del campo `opening_hours` de OpenStreetMap.
 *
 * La sintaxis completa es enorme (estaciones del año, festivos, "el tercer
 * domingo", puestas de sol...). Aquí se cubre el subconjunto que aparece en la
 * inmensa mayoría de museos, monumentos y restaurantes, y **cualquier cosa que
 * no se entienda devuelve "desconocido"**.
 *
 * Esa decisión es deliberada: decirle a alguien que el Guggenheim está abierto
 * cuando está cerrado es peor que no decirle nada. Ante la duda, callamos y
 * enseñamos el texto original para que lo lea la persona.
 */

const DIAS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export const NOMBRE_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;

/** Intervalo abierto, en minutos desde medianoche. `fin` puede pasar de 1440 si cruza la noche. */
type Intervalo = [inicio: number, fin: number];

export type EstadoApertura =
  | { estado: "abierto"; cierraA: string; minutosParaCerrar: number }
  | { estado: "cerrado"; abreA?: string; abreDia?: string }
  | { estado: "desconocido" };

/** Lunes = 0, como en OpenStreetMap. `Date.getDay()` usa domingo = 0. */
function diaDeSemana(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 24 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function aTexto(minutos: number): string {
  const m = minutos % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "Mo-Fr", "Mo,We,Fr", "Sa" -> índices de día. `null` si no se entiende. */
function leerDias(texto: string): number[] | null {
  const dias = new Set<number>();
  for (const trozo of texto.split(",")) {
    const rango = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(trozo);
    if (rango) {
      const desde = DIAS.indexOf(rango[1] as (typeof DIAS)[number]);
      const hasta = DIAS.indexOf(rango[2] as (typeof DIAS)[number]);
      if (desde < 0 || hasta < 0) return null;
      // Los rangos pueden dar la vuelta a la semana: "Sa-Su", "Fr-Mo".
      for (let i = desde; ; i = (i + 1) % 7) {
        dias.add(i);
        if (i === hasta) break;
      }
      continue;
    }
    const suelto = DIAS.indexOf(trozo as (typeof DIAS)[number]);
    if (suelto < 0) return null;
    dias.add(suelto);
  }
  return dias.size > 0 ? [...dias] : null;
}

/** "09:00-14:00,16:00-20:00" -> intervalos. `null` si no se entiende. */
function leerHoras(texto: string): Intervalo[] | null {
  const intervalos: Intervalo[] = [];
  for (const trozo of texto.split(",")) {
    const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(trozo.trim());
    if (!m) return null;
    const inicio = aMinutos(m[1]);
    let fin = aMinutos(m[2]);
    if (inicio == null || fin == null) return null;
    // "20:00-02:00" cruza la medianoche; se representa pasando de 1440.
    if (fin <= inicio) fin += 1440;
    intervalos.push([inicio, fin]);
  }
  return intervalos;
}

const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Dec 24,Dec 31: 10:00-17:00" -> fechas por un lado, horario por otro. */
const REGLA_POR_FECHA = /^([A-Z][a-z]{2}\s+\d{1,2}(?:\s*,\s*[A-Z][a-z]{2}\s+\d{1,2})*)\s*:\s*(.+)$/;

/** "Dec 24" -> mes (0-11) y día. `null` si no es una fecha reconocible. */
function leerFecha(texto: string): { mes: number; dia: number } | null {
  const m = /^([A-Z][a-z]{2})\s+(\d{1,2})$/.exec(texto);
  if (!m) return null;
  const mes = MESES.indexOf(m[1] as (typeof MESES)[number]);
  if (mes < 0) return null;
  return { mes, dia: Number(m[2]) };
}

/**
 * Convierte la especificación en los intervalos de cada día de la semana.
 * `null` = no se ha entendido y no debemos afirmar nada.
 *
 * `referencia` hace falta para las excepciones por fecha: "Dec 25: off" sólo
 * importa si hoy es 25 de diciembre.
 */
function leerSemana(especificacion: string, referencia: Date): Map<number, Intervalo[]> | null {
  const limpio = especificacion.trim();
  if (!limpio) return null;

  const semana = new Map<number, Intervalo[]>();
  for (let d = 0; d < 7; d++) semana.set(d, []);

  for (const reglaCruda of limpio.split(";")) {
    const regla = reglaCruda.trim();
    if (!regla) continue;

    if (regla === "24/7") {
      for (let d = 0; d < 7; d++) semana.set(d, [[0, 1440]]);
      continue;
    }

    // Festivos y vacaciones escolares: no sabemos el calendario del país, así
    // que ignoramos la regla en vez de fingir que la entendemos.
    if (/^(PH|SH)\b/.test(regla)) continue;

    // Excepciones en fechas concretas: "Dec 24,Dec 31: 10:00-17:00".
    // Aparecen en casi todos los museos y antes tiraban el horario entero.
    const excepcion = REGLA_POR_FECHA.exec(regla);
    if (excepcion) {
      const afectaHoy = excepcion[1]
        .split(",")
        .map((f) => leerFecha(f.trim()))
        .some((f) => f != null && f.mes === referencia.getMonth() && f.dia === referencia.getDate());
      // Si la excepción no cae hoy, no dice nada del horario normal: se ignora.
      if (!afectaHoy) continue;

      const resto = excepcion[2].trim();
      const diaHoy = diaDeSemana(referencia);
      if (/^(off|closed)$/i.test(resto)) {
        semana.set(diaHoy, []);
        continue;
      }
      const intervalos = leerHoras(resto);
      if (!intervalos) return null;
      semana.set(diaHoy, intervalos);
      continue;
    }

    const partes = regla.split(/\s+/);
    const cierra = /^(off|closed)$/i.test(partes[partes.length - 1]);
    const textoDias = partes.length > 1 ? partes[0] : null;
    const textoHoras = cierra ? null : partes[partes.length - 1];

    const dias = textoDias ? leerDias(textoDias) : [0, 1, 2, 3, 4, 5, 6];
    if (!dias) return null;

    if (cierra) {
      for (const d of dias) semana.set(d, []);
      continue;
    }

    // Sin parte de días la regla es sólo horas y vale para toda la semana.
    if (!textoHoras || (partes.length > 2 && textoDias)) return null;
    const intervalos = leerHoras(textoHoras);
    if (!intervalos) return null;
    for (const d of dias) semana.set(d, intervalos);
  }

  return semana;
}

/** ¿Abre ese día? `null` cuando el horario no se ha podido interpretar. */
export function abreEseDia(especificacion: string | undefined, fecha: Date): boolean | null {
  if (!especificacion) return null;
  const semana = leerSemana(especificacion, fecha);
  if (!semana) return null;
  return (semana.get(diaDeSemana(fecha)) ?? []).length > 0;
}

/** Estado ahora mismo: abierto (y a qué hora cierra), cerrado (y cuándo abre) o desconocido. */
export function estadoDeApertura(especificacion: string | undefined, ahora = new Date()): EstadoApertura {
  if (!especificacion) return { estado: "desconocido" };
  const semana = leerSemana(especificacion, ahora);
  if (!semana) return { estado: "desconocido" };

  const hoy = diaDeSemana(ahora);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  // Abierto puede venir de hoy o de un horario de ayer que cruzó la medianoche.
  for (const [desplazamiento, referencia] of [
    [0, minutosAhora],
    [-1, minutosAhora + 1440],
  ] as const) {
    const dia = (hoy + desplazamiento + 7) % 7;
    for (const [inicio, fin] of semana.get(dia) ?? []) {
      if (referencia >= inicio && referencia < fin) {
        return { estado: "abierto", cierraA: aTexto(fin), minutosParaCerrar: fin - referencia };
      }
    }
  }

  // Cerrado: buscamos la próxima apertura dentro de la semana siguiente.
  for (let salto = 0; salto < 8; salto++) {
    const dia = (hoy + salto) % 7;
    for (const [inicio] of semana.get(dia) ?? []) {
      if (salto === 0 && inicio <= minutosAhora) continue;
      return {
        estado: "cerrado",
        abreA: aTexto(inicio),
        abreDia: salto === 0 ? "hoy" : salto === 1 ? "mañana" : NOMBRE_DIA[dia],
      };
    }
  }

  return { estado: "cerrado" };
}
