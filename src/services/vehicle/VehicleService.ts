import type { Refuel, Vehicle, VehicleStats } from "../../types";

/**
 * Cálculos del vehículo (sección 5 y 31). Nunca simula datos: si no hay
 * repostajes registrados, las métricas derivadas quedan en `null` en vez de
 * inventarse un consumo.
 */
export const VehicleService = {
  computeStats(vehicle: Vehicle, refuels: Refuel[]): VehicleStats {
    const sorted = [...refuels].sort((a, b) => a.odometerKm - b.odometerKm);
    const totalKm = vehicle.odometerEndKm != null ? vehicle.odometerEndKm - vehicle.odometerStartKm : sorted.length > 0 ? sorted[sorted.length - 1].odometerKm - vehicle.odometerStartKm : 0;

    const totalLiters = refuels.reduce((sum, r) => sum + r.liters, 0);
    const totalFuelCost = refuels.reduce((sum, r) => sum + r.totalCost, 0);

    // Consumo real solo es fiable entre dos repostajes "depósito lleno".
    const fullTankRefuels = sorted.filter((r) => r.fullTank);
    let realConsumptionL100km: number | null = null;
    if (fullTankRefuels.length >= 2) {
      const first = fullTankRefuels[0];
      const last = fullTankRefuels[fullTankRefuels.length - 1];
      const kmBetween = last.odometerKm - first.odometerKm;
      const litersBetween = fullTankRefuels.slice(1).reduce((sum, r) => sum + r.liters, 0);
      realConsumptionL100km = kmBetween > 0 ? (litersBetween / kmBetween) * 100 : null;
    }

    const costPerKm = totalKm > 0 && totalFuelCost > 0 ? totalFuelCost / totalKm : null;
    const estimatedRangeKm = realConsumptionL100km ? (vehicle.tankCapacityLiters / realConsumptionL100km) * 100 : (vehicle.tankCapacityLiters / vehicle.averageConsumptionL100km) * 100;
    const differenceVsBaselineL100km = realConsumptionL100km != null ? realConsumptionL100km - vehicle.averageConsumptionL100km : null;

    return { totalKm, totalLiters, totalFuelCost, realConsumptionL100km, costPerKm, estimatedRangeKm, differenceVsBaselineL100km };
  },
};
