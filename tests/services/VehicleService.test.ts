import { describe, expect, it } from "vitest";
import { VehicleService } from "../../src/services/vehicle/VehicleService";
import type { Refuel, Vehicle } from "../../src/types";

const vehicle: Vehicle = {
  id: "vehicle-golf",
  make: "Volkswagen",
  model: "Golf",
  engine: "1.9 TDI",
  color: "Negro",
  fuelType: "diesel",
  tankCapacityLiters: 55,
  averageConsumptionL100km: 4.5,
  odometerStartKm: 300000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function refuel(partial: Partial<Refuel>): Refuel {
  return {
    id: partial.id ?? "refuel-1",
    vehicleId: vehicle.id,
    date: "2026-08-29",
    place: "Repsol",
    odometerKm: 300000,
    liters: 40,
    pricePerLiter: 1.5,
    totalCost: 60,
    fullTank: true,
    notes: "",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...partial,
  };
}

describe("VehicleService.computeStats", () => {
  it("never fabricates a real consumption without at least two full-tank refuels", () => {
    const stats = VehicleService.computeStats(vehicle, [refuel({ fullTank: true, odometerKm: 300100 })]);
    expect(stats.realConsumptionL100km).toBeNull();
  });

  it("computes real consumption between two full-tank refuels", () => {
    const refuels = [
      refuel({ id: "r1", odometerKm: 300000, liters: 50, fullTank: true }),
      refuel({ id: "r2", odometerKm: 300500, liters: 25, fullTank: true }),
    ];
    const stats = VehicleService.computeStats(vehicle, refuels);
    // 25L consumidos en 500km -> 5 L/100km
    expect(stats.realConsumptionL100km).toBeCloseTo(5, 5);
    expect(stats.differenceVsBaselineL100km).toBeCloseTo(0.5, 5);
  });

  it("falls back to the manufacturer-stated consumption for estimated range when no refuels exist", () => {
    const stats = VehicleService.computeStats(vehicle, []);
    // 55L / 4.5L/100km * 100 = 1222.2km
    expect(stats.estimatedRangeKm).toBeCloseTo(1222.2, 1);
  });

  it("uses the odometer end reading for total km when available", () => {
    const stats = VehicleService.computeStats({ ...vehicle, odometerEndKm: 301500 }, []);
    expect(stats.totalKm).toBe(1500);
  });
});
