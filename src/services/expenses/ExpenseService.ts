import type { Expense, ExpenseCategory, ExpenseStats, ID } from "../../types";

const EMPTY_CATEGORY_TOTALS: Record<ExpenseCategory, number> = {
  combustible: 0,
  hotel: 0,
  restaurante: 0,
  aparcamiento: 0,
  peaje: 0,
  entrada: 0,
  compra: 0,
  otros: 0,
};

export const ExpenseService = {
  computeStats(expenses: Expense[], totalKm: number): ExpenseStats {
    const actual = expenses.filter((e) => e.kind === "actual");
    const expected = expenses.filter((e) => e.kind === "expected");

    const byCategory = { ...EMPTY_CATEGORY_TOTALS };
    const byDay: Record<ID, number> = {};
    const byTraveler: Record<ID, number> = {};
    const paidByTraveler: Record<ID, number> = {};
    const owedByTraveler: Record<ID, number> = {};

    for (const expense of actual) {
      byCategory[expense.category] += expense.amountEUR;
      if (expense.dayId) byDay[expense.dayId] = (byDay[expense.dayId] ?? 0) + expense.amountEUR;

      if (expense.paidByTravelerId) {
        paidByTraveler[expense.paidByTravelerId] = (paidByTraveler[expense.paidByTravelerId] ?? 0) + expense.amountEUR;
      }

      const splitAmong = expense.splitBetweenTravelerIds.length > 0 ? expense.splitBetweenTravelerIds : expense.paidByTravelerId ? [expense.paidByTravelerId] : [];
      if (splitAmong.length > 0) {
        const share = expense.amountEUR / splitAmong.length;
        for (const travelerId of splitAmong) {
          byTraveler[travelerId] = (byTraveler[travelerId] ?? 0) + share;
          owedByTraveler[travelerId] = (owedByTraveler[travelerId] ?? 0) + share;
        }
      }
    }

    const totalEUR = actual.reduce((sum, e) => sum + e.amountEUR, 0);
    const totalExpectedEUR = expected.reduce((sum, e) => sum + e.amountEUR, 0);

    const balanceByTraveler: Record<ID, number> = {};
    const travelerIds = new Set([...Object.keys(paidByTraveler), ...Object.keys(owedByTraveler)]);
    for (const travelerId of travelerIds) {
      balanceByTraveler[travelerId] = (paidByTraveler[travelerId] ?? 0) - (owedByTraveler[travelerId] ?? 0);
    }

    return {
      totalEUR,
      totalExpectedEUR,
      byCategory,
      byDay,
      byTraveler,
      costPerKm: totalKm > 0 ? totalEUR / totalKm : null,
      balanceByTraveler,
    };
  },

  toCSV(expenses: Expense[]): string {
    const header = ["fecha", "hora", "importe_eur", "categoria", "lugar", "dia", "metodo_pago", "tipo", "notas"];
    const rows = expenses.map((e) => [e.date, e.time, e.amountEUR.toFixed(2), e.category, e.place, e.dayId ?? "", e.paymentMethod, e.kind, e.notes.replace(/\n/g, " ")]);
    return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  },
};
