import { describe, expect, it } from "vitest";
import { liquidar, textoLiquidacion } from "../../src/services/expenses/liquidacion";

const suma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe("liquidar", () => {
  it("no propone nada cuando está todo a cero", () => {
    expect(liquidar({ ana: 0, luis: 0 })).toEqual([]);
  });

  it("resuelve el caso de dos personas", () => {
    // Ana puso 30 de más, Luis debe 30.
    expect(liquidar({ ana: 30, luis: -30 })).toEqual([{ de: "luis", a: "ana", importeEUR: 30 }]);
  });

  it("reparte un deudor entre dos acreedores", () => {
    const pagos = liquidar({ ana: 40, luis: 20, marta: -60 });

    expect(pagos).toHaveLength(2);
    expect(pagos.every((p) => p.de === "marta")).toBe(true);
    expect(suma(pagos.map((p) => p.importeEUR))).toBeCloseTo(60, 2);
  });

  it("nunca inventa ni pierde dinero", () => {
    // Lo que sale de unos tiene que ser exactamente lo que entra a otros.
    const saldos = { ana: 75.5, luis: -20.25, marta: -55.25, pedro: 0 };
    const pagos = liquidar(saldos);

    expect(suma(pagos.map((p) => p.importeEUR))).toBeCloseTo(75.5, 2);
  });

  it("deja fuera a quien está en paz", () => {
    const pagos = liquidar({ ana: 30, luis: -30, pedro: 0 });
    expect(pagos.some((p) => p.de === "pedro" || p.a === "pedro")).toBe(false);
  });

  it("ignora las diferencias de menos de un céntimo", () => {
    // Un redondeo de 0,002 € no es una deuda que mandar por WhatsApp.
    expect(liquidar({ ana: 0.002, luis: -0.002 })).toEqual([]);
  });

  it("no se enreda con cuatro personas", () => {
    const saldos = { a: 100, b: -40, c: -35, d: -25 };
    const pagos = liquidar(saldos);

    expect(suma(pagos.map((p) => p.importeEUR))).toBeCloseTo(100, 2);
    expect(pagos.every((p) => p.a === "a")).toBe(true);
  });
});

describe("textoLiquidacion", () => {
  const nombre = (id: string) => ({ ana: "Ana", luis: "Luis" })[id] ?? id;
  const euros = (n: number) => `${n.toFixed(2)} €`;

  it("lo dice claro cuando no hay deudas", () => {
    expect(textoLiquidacion([], nombre, euros)).toBe("Las cuentas están saldadas.");
  });

  it("usa nombres, no identificadores", () => {
    const texto = textoLiquidacion([{ de: "luis", a: "ana", importeEUR: 30 }], nombre, euros);
    expect(texto).toBe("Luis → Ana: 30.00 €");
  });
});
