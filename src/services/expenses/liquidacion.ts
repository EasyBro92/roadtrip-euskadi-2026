import type { ID } from "../../types";

export interface Pago {
  de: ID;
  a: ID;
  importeEUR: number;
}

/** Por debajo de un céntimo no es una deuda, es un redondeo. */
const CENTIMO = 0.005;

/**
 * Convierte los saldos en la lista más corta de pagos que los deja a cero.
 *
 * Saldo positivo = puso de más y le deben; negativo = debe. Se empareja al que
 * más debe con el que más ha puesto, una y otra vez. No siempre es el mínimo
 * absoluto de transferencias — ese problema es NP-difícil— pero para cuatro
 * amigos en un coche da el mismo resultado y se entiende de un vistazo.
 *
 * Lo importante es que no invente dinero: la suma de lo que sale es igual a
 * la suma de lo que entra.
 */
export function liquidar(saldos: Record<ID, number>): Pago[] {
  const deben = Object.entries(saldos)
    .filter(([, v]) => v < -CENTIMO)
    .map(([id, v]) => ({ id, importe: -v }))
    .sort((a, b) => b.importe - a.importe);

  const lesDeben = Object.entries(saldos)
    .filter(([, v]) => v > CENTIMO)
    .map(([id, v]) => ({ id, importe: v }))
    .sort((a, b) => b.importe - a.importe);

  const pagos: Pago[] = [];
  let i = 0;
  let j = 0;

  while (i < deben.length && j < lesDeben.length) {
    const cuanto = Math.min(deben[i].importe, lesDeben[j].importe);
    if (cuanto > CENTIMO) {
      pagos.push({ de: deben[i].id, a: lesDeben[j].id, importeEUR: Math.round(cuanto * 100) / 100 });
    }
    deben[i].importe -= cuanto;
    lesDeben[j].importe -= cuanto;
    if (deben[i].importe <= CENTIMO) i++;
    if (lesDeben[j].importe <= CENTIMO) j++;
  }

  return pagos;
}

/** Resumen en texto plano, para mandarlo por WhatsApp. */
export function textoLiquidacion(pagos: Pago[], nombreDe: (id: ID) => string, formatear: (n: number) => string): string {
  if (pagos.length === 0) return "Las cuentas están saldadas.";
  return pagos.map((p) => `${nombreDe(p.de)} → ${nombreDe(p.a)}: ${formatear(p.importeEUR)}`).join("\n");
}
