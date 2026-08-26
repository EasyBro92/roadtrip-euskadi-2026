import { describe, expect, it } from "vitest";
import { proximos, type Documento } from "../../src/services/documents/DocumentService";

function doc(fecha?: string): Documento {
  return { id: fecha ?? "sin", dayId: null, titulo: "Hotel", tipo: "reserva", fecha, createdAt: "2026-08-01T00:00:00Z" };
}

describe("proximos", () => {
  const hoy = new Date("2026-08-26T10:00:00Z");

  it("incluye lo de hoy", () => {
    expect(proximos([doc("2026-08-26")], hoy)).toHaveLength(1);
  });

  it("incluye lo de mañana, que es cuando avisar sirve de algo", () => {
    expect(proximos([doc("2026-08-27")], hoy)).toHaveLength(1);
  });

  it("deja fuera lo de pasado mañana", () => {
    expect(proximos([doc("2026-08-28")], hoy)).toHaveLength(0);
  });

  it("deja fuera lo de ayer", () => {
    expect(proximos([doc("2026-08-25")], hoy)).toHaveLength(0);
  });

  it("ignora los apuntes sin fecha", () => {
    expect(proximos([doc(undefined)], hoy)).toHaveLength(0);
  });

  it("cruza bien el final de mes", () => {
    const finDeMes = new Date("2026-08-31T10:00:00Z");
    expect(proximos([doc("2026-09-01")], finDeMes)).toHaveLength(1);
  });
});
