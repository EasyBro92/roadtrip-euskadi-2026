import { describe, expect, it } from "vitest";
import { calcularSaldos, detallePorViajero, estadoDelBote, quienLlenaElBote, type Aportacion } from "../../src/services/expenses/bote";
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
  it("suma cero cuando el bote se ha gastado entero", () => {
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

  it("suman cero aunque del bote salga más de lo que se metió", () => {
    /*
     * 400 gastados con 300 dentro. Esos 100 de más salieron del bolsillo de
     * Ana, que es de quien es el bote, así que figura poniendo los 400.
     *
     * Antes se topaba en 300 y los otros 100 no eran de nadie: los saldos
     * sumaban -100 y la liquidación no dejaba a todos a cero hasta que
     * alguien apuntaba la diferencia a mano.
     */
    const gastos = [gasto(400, { pagadoDelBote: true })];
    const s = calcularSaldos(gastos, [aportacion("ana", 300)], VIAJEROS);

    expect(s.ana).toBeCloseTo(200);
    expect(s.luis).toBeCloseTo(-200);
    expect(suma(s)).toBeCloseTo(0, 6);
  });
});

describe("gastos que no son de todos", () => {
  it("una cena de uno solo no la paga el otro", () => {
    // Lo que hacen Splitwise y Tricount y aquí faltaba: si Luis cena solo,
    // esa cena es suya entera, no a medias.
    const s = calcularSaldos([gasto(40, { paidByTravelerId: "ana", splitBetweenTravelerIds: ["luis"] })], [], VIAJEROS);

    expect(s.ana).toBeCloseTo(40);
    expect(s.luis).toBeCloseTo(-40);
  });

  it("mezcla gastos de todos con gastos de uno", () => {
    const gastos = [
      gasto(100, { paidByTravelerId: "ana" }), // de los dos, 50 cada uno
      gasto(30, { paidByTravelerId: "ana", splitBetweenTravelerIds: ["luis"] }), // sólo de Luis
    ];
    const s = calcularSaldos(gastos, [], VIAJEROS);

    // Ana puso 130 y le tocan 50; Luis no puso nada y le tocan 80.
    expect(s.ana).toBeCloseTo(80);
    expect(s.luis).toBeCloseTo(-80);
  });

  it("del bote también se puede repartir entre algunos", () => {
    const gastos = [gasto(60, { pagadoDelBote: true, splitBetweenTravelerIds: ["ana"] })];
    const s = calcularSaldos(gastos, [aportacion("ana", 60)], VIAJEROS);

    // Ana puso 60 del bote y el gasto es suyo entero: queda en paz.
    expect(s.ana).toBeCloseTo(0);
    expect(s.luis).toBeCloseTo(0);
  });

  it("no se pierde dinero repartiendo entre algunos", () => {
    const gastos = [gasto(90, { paidByTravelerId: "luis", splitBetweenTravelerIds: ["ana"] }), gasto(40, { paidByTravelerId: "ana" })];
    expect(suma(calcularSaldos(gastos, [], VIAJEROS))).toBeCloseTo(0, 6);
  });
});

describe("de dónde sale lo que puso cada uno", () => {
  it("reparte el bote gastado entre quienes lo llenaron", () => {
    /*
     * Lo que no se entendía: si Ana pone 200 y Luis 100 y del bote salen los
     * 300, leer "Ana puso 200" a secas parece que lo adelantó todo ella y que
     * los otros 100 los puso la casa. Cada uno ha puesto lo suyo.
     */
    const d = detallePorViajero([gasto(300, { pagadoDelBote: true })], [aportacion("ana", 200), aportacion("luis", 100)], VIAJEROS);

    expect(d.ana.porElBote).toBeCloseTo(200);
    expect(d.luis.porElBote).toBeCloseTo(100);
    expect(d.ana.deSuBolsillo).toBe(0);
    expect(d.ana.puso).toBeCloseTo(200);

    // Consumen 150 cada uno: Ana puso 50 de más y Luis 50 de menos.
    expect(d.ana.saldo).toBeCloseTo(50);
    expect(d.luis.saldo).toBeCloseTo(-50);
  });

  it("del bote sólo cuenta la parte ya gastada", () => {
    // Ana pone 200 y salen 100: la otra mitad sigue siendo suya.
    const d = detallePorViajero([gasto(100, { pagadoDelBote: true })], [aportacion("ana", 200)], VIAJEROS);

    expect(d.ana.porElBote).toBeCloseTo(100);
    expect(d.ana.puso).toBeCloseTo(100);
  });

  it("separa lo que pagó suelto de lo que puso en el bote", () => {
    const gastos = [gasto(100, { pagadoDelBote: true }), gasto(60, { paidByTravelerId: "ana" })];
    const d = detallePorViajero(gastos, [aportacion("ana", 100)], VIAJEROS);

    expect(d.ana.deSuBolsillo).toBeCloseTo(60);
    expect(d.ana.porElBote).toBeCloseTo(100);
    expect(d.ana.puso).toBeCloseTo(160);
  });

  it("quien llena el bote adelanta lo que sale de más", () => {
    // 200 dentro y 300 fuera: los 100 de diferencia los ha puesto Ana, que es
    // la única que ha metido dinero. No hay que apuntarlos aparte.
    const d = detallePorViajero([gasto(300, { pagadoDelBote: true })], [aportacion("ana", 200)], VIAJEROS);

    expect(d.ana.porElBote).toBeCloseTo(300);
    expect(d.ana.puso).toBeCloseTo(300);
    expect(d.luis.puso).toBe(0);
    expect(d.luis.saldo).toBeCloseTo(-150);
  });

  it("si el bote lo llenan varios, lo de más se reparte como se llenó", () => {
    // 200 de Ana y 100 de Luis, y salen 330: cada uno ha adelantado un 10% de
    // más. Con varios no se puede saber quién puso la diferencia, y repartirla
    // igual que el bote es lo único que no favorece a nadie.
    const d = detallePorViajero([gasto(330, { pagadoDelBote: true })], [aportacion("ana", 200), aportacion("luis", 100)], VIAJEROS);

    expect(d.ana.porElBote).toBeCloseTo(220);
    expect(d.luis.porElBote).toBeCloseTo(110);
  });

  it("del bote sin nada dentro no lo pone nadie", () => {
    // Sin aportaciones no hay a quién repartirlo, y el saldo lo enseña: es el
    // único caso que sigue necesitando que alguien diga quién puso el dinero.
    const d = detallePorViajero([gasto(50, { pagadoDelBote: true })], [], VIAJEROS);

    expect(d.ana.puso).toBe(0);
    expect(d.luis.puso).toBe(0);
    expect(d.ana.saldo).toBeCloseTo(-25);
  });

  it("lo que puso es siempre lo suelto más lo del bote", () => {
    const gastos = [gasto(120, { pagadoDelBote: true }), gasto(45.5, { paidByTravelerId: "luis" })];
    const d = detallePorViajero(gastos, [aportacion("ana", 90), aportacion("luis", 60)], VIAJEROS);

    for (const id of VIAJEROS) expect(d[id].puso).toBeCloseTo(d[id].deSuBolsillo + d[id].porElBote);
  });
});

describe("quienLlenaElBote", () => {
  it("da el nombre cuando lo pone una sola persona", () => {
    // Con un solo dueño, "el bote" y esa persona son lo mismo, y decirlo con
    // su nombre evita la duda de si marcar "bote" descuenta de ella.
    expect(quienLlenaElBote([aportacion("ana", 200), aportacion("ana", 50)])).toBe("ana");
  });

  it("no elige uno si lo llenan varios", () => {
    expect(quienLlenaElBote([aportacion("ana", 200), aportacion("luis", 50)])).toBeNull();
  });

  it("sin bote no hay nadie", () => {
    expect(quienLlenaElBote([])).toBeNull();
  });
});
