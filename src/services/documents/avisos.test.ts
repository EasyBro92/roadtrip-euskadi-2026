import { describe, expect, it } from "vitest";
import { avisosDeReservas, type Documento } from "./DocumentService";

const base: Documento = { id: "d1", dayId: null, titulo: "Hotel Bilbao", tipo: "reserva", createdAt: "2026-01-01" };

describe("avisosDeReservas", () => {
  const hoy = new Date("2026-08-28T10:00:00");

  it("avisa de lo que empieza mañana y de la cancelación que vence hoy", () => {
    const avisos = avisosDeReservas([{ ...base, fecha: "2026-08-29", cancelacionHasta: "2026-08-28" }], hoy);
    expect(avisos).toEqual(["Hotel Bilbao: es mañana.", "La cancelación gratis de Hotel Bilbao vence hoy."]);
  });

  it("no dice nada de lo lejano", () => {
    expect(avisosDeReservas([{ ...base, fecha: "2026-09-10", cancelacionHasta: "2026-09-01" }], hoy)).toEqual([]);
  });
});
