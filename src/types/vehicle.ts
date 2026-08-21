import type { ID, ISODate, Timestamped } from "./common";

export type FuelType = "diesel" | "gasolina-95" | "gasolina-98" | "hibrido" | "electrico";

/** Ficha del vehículo ("Mi Golf"). Todos los campos son editables por el usuario. */
export interface Vehicle extends Timestamped {
  id: ID;
  make: string;
  model: string;
  engine: string;
  plate?: string;
  color: string;
  fuelType: FuelType;
  tankCapacityLiters: number;
  averageConsumptionL100km: number;
  odometerStartKm: number;
  odometerEndKm?: number;
}

/** Registro real de un repostaje. Nunca se simula: solo datos introducidos por el usuario. */
export interface Refuel extends Timestamped {
  id: ID;
  vehicleId: ID;
  date: ISODate;
  place: string;
  odometerKm: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fullTank: boolean;
  notes: string;
}

export interface VehicleStats {
  totalKm: number;
  totalLiters: number;
  totalFuelCost: number;
  realConsumptionL100km: number | null;
  costPerKm: number | null;
  estimatedRangeKm: number | null;
  differenceVsBaselineL100km: number | null;
}
