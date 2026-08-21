import { describe, expect, it } from "vitest";
import { ExpenseService } from "../../src/services/expenses/ExpenseService";
import type { Expense } from "../../src/types";

function makeExpense(partial: Partial<Expense>): Expense {
  return {
    id: partial.id ?? "expense-1",
    date: "2026-08-30",
    time: "13:30",
    amountEUR: 20,
    category: "restaurante",
    place: "Parte Vieja",
    dayId: "day-2",
    stopId: null,
    paidByTravelerId: "traveler-1",
    splitBetweenTravelerIds: ["traveler-1", "traveler-2"],
    paymentMethod: "tarjeta",
    notes: "",
    receiptPhotoId: null,
    kind: "actual",
    createdAt: "2026-08-30T13:30:00.000Z",
    updatedAt: "2026-08-30T13:30:00.000Z",
    ...partial,
  };
}

describe("ExpenseService.computeStats", () => {
  it("sums totals only from actual expenses, ignoring expected ones", () => {
    const expenses = [makeExpense({ amountEUR: 20, kind: "actual" }), makeExpense({ id: "e2", amountEUR: 999, kind: "expected" })];
    const stats = ExpenseService.computeStats(expenses, 100);
    expect(stats.totalEUR).toBe(20);
    expect(stats.totalExpectedEUR).toBe(999);
  });

  it("buckets totals by category and by day", () => {
    const expenses = [
      makeExpense({ id: "e1", category: "combustible", amountEUR: 50, dayId: "day-1" }),
      makeExpense({ id: "e2", category: "combustible", amountEUR: 30, dayId: "day-1" }),
      makeExpense({ id: "e3", category: "hotel", amountEUR: 80, dayId: "day-2" }),
    ];
    const stats = ExpenseService.computeStats(expenses, 100);
    expect(stats.byCategory.combustible).toBe(80);
    expect(stats.byCategory.hotel).toBe(80);
    expect(stats.byDay["day-1"]).toBe(80);
    expect(stats.byDay["day-2"]).toBe(80);
  });

  it("splits an expense evenly between travelers for balance calculation", () => {
    const expenses = [makeExpense({ amountEUR: 20, paidByTravelerId: "traveler-1", splitBetweenTravelerIds: ["traveler-1", "traveler-2"] })];
    const stats = ExpenseService.computeStats(expenses, 100);
    // traveler-1 pagó 20, debía 10 -> balance +10; traveler-2 debía 10 y no pagó -> balance -10
    expect(stats.balanceByTraveler["traveler-1"]).toBeCloseTo(10);
    expect(stats.balanceByTraveler["traveler-2"]).toBeCloseTo(-10);
  });

  it("returns null costPerKm when there are 0 km", () => {
    const stats = ExpenseService.computeStats([makeExpense({})], 0);
    expect(stats.costPerKm).toBeNull();
  });

  it("computes costPerKm when km are available", () => {
    const stats = ExpenseService.computeStats([makeExpense({ amountEUR: 50 })], 100);
    expect(stats.costPerKm).toBeCloseTo(0.5);
  });
});

describe("ExpenseService.toCSV", () => {
  it("produces a header row plus one row per expense", () => {
    const csv = ExpenseService.toCSV([makeExpense({}), makeExpense({ id: "e2" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("categoria");
  });
});
