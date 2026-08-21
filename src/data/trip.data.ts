import type { ReturnTripOption, Trip, TripDay, Vehicle } from "../types";
import { SEED_STOPS_BY_DAY } from "./stops.data";
import { SEED_TIMESTAMP } from "./stopFactory";

export const SEED_VEHICLE: Vehicle = {
  id: "vehicle-golf",
  make: "Volkswagen",
  model: "Golf",
  engine: "1.9 TDI",
  plate: undefined,
  color: "Negro",
  fuelType: "diesel",
  tankCapacityLiters: 55,
  averageConsumptionL100km: 4.5,
  odometerStartKm: 300000,
  odometerEndKm: undefined,
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
};

function overloadedFlag(dayId: string): boolean {
  return SEED_STOPS_BY_DAY[dayId].length > 6;
}

export const SEED_DAYS: TripDay[] = [
  { id: "day-1", index: 0, date: "2026-08-29", title: "Girona → Castillo de Loarre → Huesca", stopIds: SEED_STOPS_BY_DAY["day-1"].map((s) => s.id), isOverloaded: overloadedFlag("day-1"), rainModeActive: false, notes: "" },
  { id: "day-2", index: 1, date: "2026-08-30", title: "Huesca → Pamplona → Hondarribia → San Sebastián", stopIds: SEED_STOPS_BY_DAY["day-2"].map((s) => s.id), isOverloaded: overloadedFlag("day-2"), rainModeActive: false, notes: "Día con más paradas de lo recomendable: revisa el aviso del copiloto." },
  { id: "day-3", index: 2, date: "2026-08-31", title: "Reale Arena → Getaria → Zumaia → Gaztelugatxe → Bilbao", stopIds: SEED_STOPS_BY_DAY["day-3"].map((s) => s.id), isOverloaded: overloadedFlag("day-3"), rainModeActive: false, notes: "" },
  { id: "day-4", index: 3, date: "2026-09-01", title: "Bilbao", stopIds: SEED_STOPS_BY_DAY["day-4"].map((s) => s.id), isOverloaded: overloadedFlag("day-4"), rainModeActive: false, notes: "" },
  { id: "day-5", index: 4, date: "2026-09-02", title: "Santoña → Santander", stopIds: SEED_STOPS_BY_DAY["day-5"].map((s) => s.id), isOverloaded: overloadedFlag("day-5"), rainModeActive: false, notes: "" },
];

export const SEED_RETURN_TRIP: ReturnTripOption = {
  id: "return-trip-1",
  label: "balanced",
  date: "2026-09-03",
  intermediateStopIds: [],
  chosenAlternativeId: undefined,
  alternatives: [],
};

export const SEED_TRIP: Trip = {
  id: "trip-roadtrip-euskadi-2026",
  name: "Roadtrip Euskadi 2026",
  startDate: "2026-08-29",
  endDate: "2026-09-02",
  travelers: [
    { id: "traveler-1", name: "Viajero 1", color: "#2563EB" },
    { id: "traveler-2", name: "Viajero 2", color: "#DB2777" },
  ],
  vehicleId: SEED_VEHICLE.id,
  vehicle: SEED_VEHICLE,
  days: SEED_DAYS,
  returnTrip: SEED_RETURN_TRIP,
  budgetEUR: 900,
  settings: {
    editLockMode: "none",
    pinHash: undefined,
    gamificationEnabled: true,
    rainModeGlobal: false,
    drivingModeEnabled: false,
    skipWelcomeScreen: false,
  },
  currentDayId: "day-1",
  currentStopId: null,
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
};

/** Localidades disponibles como parada intermedia en el editor de regreso (sección 7). */
export const RETURN_TRIP_WAYPOINTS = [
  { id: "zaragoza", name: "Zaragoza", coordinates: { latitude: 41.6488, longitude: -0.8891 } },
  { id: "logrono", name: "Logroño", coordinates: { latitude: 42.4627, longitude: -2.4449 } },
  { id: "huesca", name: "Huesca", coordinates: { latitude: 42.1401, longitude: -0.4089 } },
] as const;
