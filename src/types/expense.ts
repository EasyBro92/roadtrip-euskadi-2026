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
  splitBetweenTravelerIds: ID[];
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
