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
  /**
   * Lo suyo del bote que ya se ha gastado. Lo que queda dentro no cuenta, y
   * puede pasar de lo que puso si del bote ha salido más de lo que se metió.
   */
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
   * Del bote cuenta como puesto lo que se ha gastado de verdad, repartido
   * entre quienes lo llenaron y en la proporción en que lo llenaron.
   *
   * Lo que sigue dentro es dinero que vuelve a quien lo puso, no una
   * aportación al viaje. Contándolo entero salía que quien adelantó el dinero
   * era acreedor por tener el bote guardado en el bolsillo, y con el bote
   * intacto la app llegaba a decir "las cuentas están saldadas" mientras uno
   * le debía dinero al otro.
   *
   * Si sale más de lo que se metió, la proporción pasa de 1 y quien llenó el
   * bote figura poniendo esa diferencia. Es lo que ha pasado en la calle: el
   * bote es su dinero, y si de ahí ha salido más, lo ha adelantado él. Topando
   * en 1, esos euros no eran de nadie, los saldos dejaban de sumar cero y
   * había que apuntar la diferencia a mano cada vez que se pasaba.
   *
   * Sin nada aportado no hay entre quiénes repartirlo, y entonces sí queda
   * como gasto sin dueño: eso lo avisa la pantalla.
   */
  const totalAportado = aportaciones.reduce((s, a) => s + a.amountEUR, 0);
  const gastadoDelBote = gastos.filter((g) => g.kind === "actual" && g.pagadoDelBote).reduce((s, g) => s + g.amountEUR, 0);
  const proporcionUsada = totalAportado > 0 ? gastadoDelBote / totalAportado : 0;

  for (const a of aportaciones) {
    if (a.travelerId in porElBote) porElBote[a.travelerId] += a.amountEUR * proporcionUsada;
  }

  for (const g of gastos) {
    if (g.kind !== "actual") continue;

    if (!g.pagadoDelBote && g.paidByTravelerId && g.paidByTravelerId in deSuBolsillo) {
      deSuBolsillo[g.paidByTravelerId] += g.amountEUR;
    }

    /*
     * Reparto a medida: cada uno debe exactamente lo suyo, sin dividir nada.
     *
     * Va antes que el reparto por cabezas porque manda sobre él: si alguien se
     * ha tomado el trabajo de decir los importes uno a uno, no hay nada que
     * repartir.
     */
    if (g.splitCustomEUR) {
      for (const [id, importe] of Object.entries(g.splitCustomEUR)) {
        if (id in debe) debe[id] += importe;
      }
      continue;
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

/**
 * Quién llena el bote, cuando lo llena una sola persona.
 *
 * Si sólo pone uno, "el bote" y esa persona son lo mismo, y las pantallas lo
 * dicen con su nombre. Marcar un gasto como del bote no parece entonces que
 * no lo pague nadie: se ve que sale del dinero que adelantó ella.
 */
export function quienLlenaElBote(aportaciones: Aportacion[]): ID | null {
  const quienes = new Set(aportaciones.map((a) => a.travelerId));
  return quienes.size === 1 ? [...quienes][0] : null;
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
