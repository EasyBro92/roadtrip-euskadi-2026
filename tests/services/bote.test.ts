import { describe, expect, it } from "vitest";
import { calcularSaldos, estadoDelBote, type Aportacion } from "../../src/services/expenses/bote";
import type { Expense } from "../../src/types";

const VIAJEROS = ["ana", "luis"];

function gasto(importe: number, opciones: Partial<Expense> = {}): Expense {
  return {
    id: Math.random().toString(36),
    amountEUR: importe,
    kind: "actual",
    paidByTravelerId: null,
    splitBetweenTravelerIds: VIAJEROS,
    ...opciones,
  } as Expense;
}

function aportacion(travelerId: string, importe: number): Aportacion {
  return { id: travelerId + importe, travelerId, amountEUR: importe, date: "2026-08-29", notes: "", createdAt: "" };
}

const suma = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe("calcularSaldos con bote", () => {
  it("sin bote se comporta como siempre", () => {
    // Ana paga 100 entre dos: Luis le debe 50.
    const s = calcularSaldos([gasto(100, { paidByTravelerId: "ana" })], [], VIAJEROS);
    expect(s.ana).toBeCloseTo(50);
    expect(s.luis).toBeCloseTo(-50);
  });

  it("quien adelanta el dinero no paga de más por ello", () => {
    // Ana pone 300 y de ahí salen 200. Del bote sólo cuenta lo gastado: ha
    // puesto 200 y le tocan 100, así que Luis le debe sus 100.
    const s = calcularSaldos([gasto(200, { pagadoDelBote: true })], [aportacion("ana", 300)], VIAJEROS);
    expect(s.ana).toBeCloseTo(100);
    expect(s.luis).toBeCloseTo(-100);
  });

  it("el bote sin gastar no convierte a nadie en acreedor", () => {
    /*
     * El caso que destapó el fallo: Ana adelanta 300 que siguen intactos y
     * Luis paga una cena de 250. Contando los 300 como puestos, Ana salía
     * acreedora por tener el bote en el bolsillo y la app decía que las
     * cuentas estaban saldadas — cuando Ana le debe a Luis la mitad de la cena.
     */
    const s = calcularSaldos([gasto(250, { paidByTravelerId: "luis" })], [aportacion("ana", 300)], VIAJEROS);
    expect(s.ana).toBeCloseTo(-125);
    expect(s.luis).toBeCloseTo(125);
  });

  it("un gasto del bote no se le apunta a nadie como pagador", () => {
    // Aunque venga con pagador puesto, si es del bote manda el bote.
    const s = calcularSaldos([gasto(100, { pagadoDelBote: true, paidByTravelerId: "luis" })], [aportacion("ana", 100)], VIAJEROS);
    expect(s.luis).toBeCloseTo(-50);
  });

  it("mezcla bote y pagos sueltos", () => {
    const gastos = [gasto(200, { pagadoDelBote: true }), gasto(60, { paidByTravelerId: "luis" })];
    const s = calcularSaldos(gastos, [aportacion("ana", 200)], VIAJEROS);

    // Puesto: Ana 200, Luis 60. Gastado 260, a 130 cada uno.
    expect(s.ana).toBeCloseTo(70);
    expect(s.luis).toBeCloseTo(-70);
  });

  it("los saldos siempre suman cero", () => {
    // Si no sumaran cero, alguien pagaría de más sin que nadie cobrase.
    const gastos = [gasto(200, { pagadoDelBote: true }), gasto(60, { paidByTravelerId: "luis" }), gasto(35.5, { paidByTravelerId: "ana" })];
    const s = calcularSaldos(gastos, [aportacion("ana", 120), aportacion("luis", 80)], VIAJEROS);
    expect(suma(s)).toBeCloseTo(0, 6);
  });

  it("no cuenta los gastos previstos, sólo los reales", () => {
    const s = calcularSaldos([gasto(100, { kind: "expected", paidByTravelerId: "ana" })], [], VIAJEROS);
    expect(s.ana).toBeCloseTo(0);
  });

  it("reparte entre todos cuando el gasto no dice entre quiénes", () => {
    const s = calcularSaldos([gasto(100, { pagadoDelBote: true, splitBetweenTravelerIds: [] })], [aportacion("ana", 100)], VIAJEROS);
    expect(s.luis).toBeCloseTo(-50);
  });
});

describe("estadoDelBote", () => {
  it("cuenta lo aportado, lo gastado y lo que queda", () => {
    const e = estadoDelBote([gasto(120, { pagadoDelBote: true }), gasto(50, { paidByTravelerId: "luis" })], [aportacion("ana", 200), aportacion("luis", 50)]);

    expect(e.totalAportado).toBe(250);
    expect(e.gastadoDelBote).toBe(120);
    expect(e.restante).toBe(130);
    expect(e.aportadoPor).toEqual({ ana: 200, luis: 50 });
  });

  it("avisa en negativo si el bote se queda corto", () => {
    // Gastar del bote más de lo que hay es un error de apuntes que conviene ver.
    const e = estadoDelBote([gasto(300, { pagadoDelBote: true })], [aportacion("ana", 100)]);
    expect(e.restante).toBe(-200);
  });

  it("un bote vacío no rompe nada", () => {
    expect(estadoDelBote([], [])).toMatchObject({ totalAportado: 0, gastadoDelBote: 0, restante: 0 });
  });
});

describe("qué significa la suma de los saldos", () => {
  it("suma cero sólo cuando el bote se ha gastado entero", () => {
    // 200 dentro, 200 fuera: no queda dinero en ninguna hucha.
    const s = calcularSaldos([gasto(200, { pagadoDelBote: true })], [aportacion("ana", 200)], VIAJEROS);
    expect(suma(s)).toBeCloseTo(0, 6);
  });

  it("suman cero aunque quede dinero en el bote", () => {
    /*
     * Ana pone 300 y se gastan 200: los saldos suman 100 porque ese billete
     * sigue existiendo, en el bolsillo de Ana. No es un descuadre — es dinero
     * que todavía no se ha gastado, y por eso "quién debe a quién" sólo pide
     * a Luis sus 100, no 150.
     */
    const gastos = [gasto(200, { pagadoDelBote: true })];
    const s = calcularSaldos(gastos, [aportacion("ana", 300)], VIAJEROS);

    expect(suma(s)).toBeCloseTo(0, 6);
    expect(s.luis).toBeCloseTo(-100);
  });

  it("si el bote se queda corto, lo que falta se ve en el saldo", () => {
    // 400 gastados con 300 dentro: Ana no puede figurar como que puso 400.
    const gastos = [gasto(400, { pagadoDelBote: true })];
    const s = calcularSaldos(gastos, [aportacion("ana", 300)], VIAJEROS);
    expect(s.ana).toBeCloseTo(100);
    expect(suma(s)).toBeCloseTo(-100, 6);
  });
});
