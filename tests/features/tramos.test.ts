import { describe, expect, it } from "vitest";
import { formatearMinutos, minutosDeTramo, modoPorDefecto } from "../../src/features/itinerary/tramos";

describe("modoPorDefecto", () => {
  it("dentro de una ciudad se va andando", () => {
    // De la catedral a la plaza no se coge el coche.
    expect(modoPorDefecto(600)).toBe("pie");
    expect(modoPorDefecto(1400)).toBe("pie");
  });

  it("entre ciudades, en coche", () => {
    expect(modoPorDefecto(28000)).toBe("coche");
  });

  it("el límite está en kilómetro y medio", () => {
    expect(modoPorDefecto(1500)).toBe("pie");
    expect(modoPorDefecto(1501)).toBe("coche");
  });
});

describe("minutosDeTramo", () => {
  it("estima el paseo a ritmo de turista", () => {
    // Un kilómetro andando mirando escaparates: en torno a un cuarto de hora.
    const minutos = minutosDeTramo(1000, "pie")!;
    expect(minutos).toBeGreaterThanOrEqual(12);
    expect(minutos).toBeLessThanOrEqual(18);
  });

  it("estima el coche puerta a puerta, no a velocidad de autopista", () => {
    // 60 km reales no son 30 minutos: hay salir, rotondas y aparcar.
    const minutos = minutosDeTramo(60000, "coche")!;
    expect(minutos).toBeGreaterThan(45);
  });

  it("nunca da cero minutos", () => {
    expect(minutosDeTramo(10, "pie")).toBeGreaterThan(0);
    expect(minutosDeTramo(10, "coche")).toBeGreaterThan(0);
  });

  it("no inventa una duración para el tren ni el avión", () => {
    // Dependen del horario, no de la distancia. La hora está en el billete.
    expect(minutosDeTramo(400000, "tren")).toBeNull();
    expect(minutosDeTramo(400000, "avion")).toBeNull();
  });

  it("el bus urbano tarda más que el coche en la misma distancia corta", () => {
    expect(minutosDeTramo(5000, "bus")!).toBeGreaterThan(minutosDeTramo(5000, "coche")!);
  });
});

describe("formatearMinutos", () => {
  it("por debajo de una hora, minutos", () => {
    expect(formatearMinutos(35)).toBe("35 min");
  });

  it("las horas en punto no arrastran un cero", () => {
    expect(formatearMinutos(120)).toBe("2 h");
  });

  it("horas y minutos", () => {
    expect(formatearMinutos(80)).toBe("1 h 20 min");
  });
});
