import type { Expense, ID } from "../../types";

/** Dinero que alguien mete en el bote común. */
export interface Aportacion {
  id: ID;
  travelerId: ID;
  amountEUR: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface EstadoBote {
  /** Todo lo aportado, por quien lo aportó. */
  aportadoPor: Record<ID, number>;
  totalAportado: number;
  /** Lo gastado marcado como "del bote". */
  gastadoDelBote: number;
  /** Lo que queda dentro. Negativo significa que el bote se ha quedado corto. */
  restante: number;
}

/** Lo que ha movido cada viajero, no sólo el neto. */
export interface DetalleViajero {
  /** Pagado de su bolsillo más su parte del bote ya gastada. */
  puso: number;
  /** Sólo lo que pagó directamente él. */
  deSuBolsillo: number;
  /** Lo suyo del bote que ya se ha gastado. Lo que queda dentro no cuenta. */
  porElBote: number;
  /** Su parte de todo lo consumido. */
  debe: number;
  saldo: number;
}

/**
 * Qué ha puesto y qué ha consumido cada viajero, contando el bote.
 *
 * La cuenta es una sola resta por persona:
 *
 *   lo que puso  = lo que pagó de su bolsillo + su parte del bote ya gastada
 *   lo que debe  = su parte de todo lo gastado, venga del bote o no
 *   saldo        = puso - debe
 *
 * Así sale solo lo que hace falta: quien adelantó el dinero recupera lo que
 * sobra del bote, porque lo que sigue dentro no cuenta como puesto. No hay que
 * tratar "devolver el sobrante" como un caso aparte.
 *
 * Un gasto del bote no se le apunta a nadie como pagador: lo pagó el bote, y
 * quién lo puso ahí ya está contado en las aportaciones.
 *
 * Devuelve las tres cifras y no sólo el saldo porque con el neto no se puede
 * enseñar quién ha gastado qué: dos personas con saldo cero pueden haber
 * movido 20 € o 2.000 €.
 */
export function detallePorViajero(gastos: Expense[], aportaciones: Aportacion[], viajeros: ID[]): Record<ID, DetalleViajero> {
  const deSuBolsillo: Record<ID, number> = {};
  const porElBote: Record<ID, number> = {};
  const debe: Record<ID, number> = {};
  for (const id of viajeros) {
    deSuBolsillo[id] = 0;
    porElBote[id] = 0;
    debe[id] = 0;
  }

  /*
   * Del bote sólo cuenta como aportado lo que se ha gastado de verdad.
   *
   * Lo que sigue dentro es dinero que vuelve a quien lo puso, no una
   * aportación al viaje. Contándolo entero salía que quien adelantó el dinero
   * era acreedor por tener el bote guardado en el bolsillo, y con el bote
   * intacto la app llegaba a decir "las cuentas están saldadas" mientras uno
   * le debía dinero al otro.
   *
   * Si se ha gastado más de lo que hay, la proporción se queda en 1: nadie ha
   * puesto más de lo que puso.
   */
  const totalAportado = aportaciones.reduce((s, a) => s + a.amountEUR, 0);
  const gastadoDelBote = gastos.filter((g) => g.kind === "actual" && g.pagadoDelBote).reduce((s, g) => s + g.amountEUR, 0);
  const proporcionUsada = totalAportado > 0 ? Math.min(1, gastadoDelBote / totalAportado) : 0;

  for (const a of aportaciones) {
    if (a.travelerId in porElBote) porElBote[a.travelerId] += a.amountEUR * proporcionUsada;
  }

  for (const g of gastos) {
    if (g.kind !== "actual") continue;

    if (!g.pagadoDelBote && g.paidByTravelerId && g.paidByTravelerId in deSuBolsillo) {
      deSuBolsillo[g.paidByTravelerId] += g.amountEUR;
    }

    // Entre quiénes se reparte. Sin lista, entre todos: un gasto del bote es
    // de todos por definición.
    const entre = g.splitBetweenTravelerIds.filter((id) => id in debe);
    const reparto = entre.length > 0 ? entre : viajeros;
    if (reparto.length === 0) continue;

    const parte = g.amountEUR / reparto.length;
    for (const id of reparto) debe[id] += parte;
  }

  const detalle: Record<ID, DetalleViajero> = {};
  for (const id of viajeros) {
    const puso = deSuBolsillo[id] + porElBote[id];
    detalle[id] = { puso, deSuBolsillo: deSuBolsillo[id], porElBote: porElBote[id], debe: debe[id], saldo: puso - debe[id] };
  }
  return detalle;
}

/** Sólo el saldo de cada uno, que es lo que necesita la liquidación. */
export function calcularSaldos(gastos: Expense[], aportaciones: Aportacion[], viajeros: ID[]): Record<ID, number> {
  const detalle = detallePorViajero(gastos, aportaciones, viajeros);
  return Object.fromEntries(Object.entries(detalle).map(([id, d]) => [id, d.saldo]));
}

export function estadoDelBote(gastos: Expense[], aportaciones: Aportacion[]): EstadoBote {
  const aportadoPor: Record<ID, number> = {};
  let totalAportado = 0;
  for (const a of aportaciones) {
    aportadoPor[a.travelerId] = (aportadoPor[a.travelerId] ?? 0) + a.amountEUR;
    totalAportado += a.amountEUR;
  }

  const gastadoDelBote = gastos.filter((g) => g.kind === "actual" && g.pagadoDelBote).reduce((s, g) => s + g.amountEUR, 0);

  return { aportadoPor, totalAportado, gastadoDelBote, restante: totalAportado - gastadoDelBote };
}
