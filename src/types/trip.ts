import type { ID, ISODate, Timestamped } from "./common";
import type { ExpenseCategory } from "./expense";
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
  /**
   * Tope por categoría de gasto. Opcional y parcial a propósito: puedes
   * ponerle límite sólo a dormir y a comer y dejar el resto sin vigilar.
   * Al ser opcional, los viajes ya guardados siguen valiendo sin migración.
   */
  budgetByCategoryEUR?: Partial<Record<ExpenseCategory, number>>;
  settings: TripSettingsSlice;
  currentDayId: ID | null;
  currentStopId: ID | null;
}
