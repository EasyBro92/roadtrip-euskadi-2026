import type { ID, ISODate, Timestamped } from "./common";
import type { ReturnTripOption, TripDay } from "./route";
import type { Vehicle } from "./vehicle";

export interface Traveler {
  id: ID;
  name: string;
  color: string;
}

export type EditLockMode = "none" | "confirm" | "pin";

export interface TripSettingsSlice {
  editLockMode: EditLockMode;
  pinHash?: string;
  gamificationEnabled: boolean;
  rainModeGlobal: boolean;
  drivingModeEnabled: boolean;
  skipWelcomeScreen: boolean;
}

/** Entidad raíz del viaje. El modelo ya admite varios `Trip` aunque la v1 solo cargue uno. */
export interface Trip extends Timestamped {
  id: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  travelers: Traveler[];
  vehicleId: ID;
  vehicle: Vehicle;
  days: TripDay[];
  returnTrip: ReturnTripOption;
  budgetEUR: number;
  settings: TripSettingsSlice;
  currentDayId: ID | null;
  currentStopId: ID | null;
}
