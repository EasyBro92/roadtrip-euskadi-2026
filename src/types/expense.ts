import type { ID, ISODate, Timestamped } from "./common";

export type ExpenseCategory =
  | "combustible"
  | "hotel"
  | "restaurante"
  | "aparcamiento"
  | "peaje"
  | "entrada"
  | "compra"
  | "otros";

export type PaymentMethod = "tarjeta" | "efectivo" | "app" | "otro";

export type ExpenseKind = "expected" | "actual";

export interface Expense extends Timestamped {
  id: ID;
  date: ISODate;
  time: string;
  amountEUR: number;
  category: ExpenseCategory;
  place: string;
  dayId: ID | null;
  stopId: ID | null;
  paidByTravelerId: ID | null;
  /**
   * Salió del bote común, no del bolsillo de nadie. Opcional: los gastos ya
   * guardados siguen valiendo sin migración, y sin bote todo funciona igual.
   */
  pagadoDelBote?: boolean;
  splitBetweenTravelerIds: ID[];
  /**
   * Reparto a medida: cuánto le toca exactamente a cada uno, en euros.
   *
   * Manda sobre `splitBetweenTravelerIds`, que reparte a partes iguales. Es
   * para cuando lo justo no es la mitad: dos noches de hotel de las que uno
   * sólo duerme una, o una cena en la que uno pidió marisco. La suma tiene
   * que dar el importe del gasto, y la pantalla no deja guardar si no.
   *
   * Opcional a propósito: los gastos de antes siguen valiendo sin migración.
   */
  splitCustomEUR?: Record<ID, number>;
  paymentMethod: PaymentMethod;
  notes: string;
  receiptPhotoId: ID | null;
  kind: ExpenseKind;
}

export interface ExpenseStats {
  totalEUR: number;
  totalExpectedEUR: number;
  byCategory: Record<ExpenseCategory, number>;
  byDay: Record<ID, number>;
  byTraveler: Record<ID, number>;
  costPerKm: number | null;
  balanceByTraveler: Record<ID, number>;
}
