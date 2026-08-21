import type { ID, ISODate, Trip, TripDay, Vehicle } from "../types";
import { shiftISODate } from "../utils/dates";
import { generateId } from "../utils/id";

/**
 * Vehículo por defecto de un viaje nuevo. Deliberadamente genérico: el Golf
 * concreto es del viaje de Euskadi, no de la app. Se edita luego en Mi coche.
 */
function createDefaultVehicle(): Vehicle {
  const now = new Date().toISOString();
  return {
    id: generateId("vehicle"),
    make: "",
    model: "",
    engine: "",
    plate: undefined,
    color: "",
    fuelType: "diesel",
    tankCapacityLiters: 50,
    averageConsumptionL100km: 6,
    odometerStartKm: 0,
    odometerEndKm: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function createDays(startDate: ISODate, dayCount: number): TripDay[] {
  return Array.from({ length: dayCount }, (_, index) => ({
    id: generateId("day"),
    index: index + 1,
    date: shiftISODate(startDate, index),
    title: `Día ${index + 1}`,
    stopIds: [],
    isOverloaded: false,
    rainModeActive: false,
    notes: "",
  }));
}

export interface NewTripInput {
  name: string;
  startDate: ISODate;
  dayCount: number;
  budgetEUR?: number;
}

/**
 * Viaje vacío listo para llenar: días creados y sin paradas. Se usa al crear
 * un viaje desde cero; copiar una ruta del catálogo parte de este mismo
 * esqueleto y luego le añade las paradas.
 */
export function createEmptyTrip({ name, startDate, dayCount, budgetEUR = 0 }: NewTripInput): Trip {
  const now = new Date().toISOString();
  const days = createDays(startDate, Math.max(1, dayCount));
  const vehicle = createDefaultVehicle();
  const endDate = days[days.length - 1].date;

  return {
    id: generateId("trip"),
    name: name.trim() || "Viaje sin nombre",
    startDate,
    endDate,
    travelers: [{ id: generateId("traveler"), name: "Viajero 1", color: "#2563EB" }],
    vehicleId: vehicle.id,
    vehicle,
    days,
    returnTrip: {
      id: generateId("return"),
      label: "no-stop",
      date: shiftISODate(endDate, 1),
      intermediateStopIds: [] as ID[],
      chosenAlternativeId: undefined,
      alternatives: [],
    },
    budgetEUR,
    settings: {
      editLockMode: "none",
      pinHash: undefined,
      gamificationEnabled: true,
      rainModeGlobal: false,
      drivingModeEnabled: false,
      skipWelcomeScreen: false,
    },
    currentDayId: days[0]?.id ?? null,
    currentStopId: null,
    createdAt: now,
    updatedAt: now,
  };
}
