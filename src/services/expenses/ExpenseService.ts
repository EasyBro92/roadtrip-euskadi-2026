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

  /**
   * Los gastos como CSV, para abrirlos en una hoja de cálculo.
   *
   * Llevan quién pagó y cómo se repartió porque en un viaje compartido eso es
   * justamente para lo que se exporta: sin esas columnas la hoja dice cuánto
   * se gastó pero no quién lo puso, que es la única cuenta que queda pendiente
   * cuando el viaje acaba.
   *
   * Los nombres son opcionales: sin ellos salen los identificadores, que al
   * menos siguen distinguiendo a una persona de otra.
   */
  toCSV(expenses: Expense[], travelers: { id: ID; name: string }[] = []): string {
    const nombre = (id: ID | null | undefined) => travelers.find((t) => t.id === id)?.name ?? id ?? "";

    const reparto = (e: Expense) =>
      e.splitCustomEUR
        ? Object.entries(e.splitCustomEUR)
            .filter(([, importe]) => importe > 0)
            .map(([id, importe]) => `${nombre(id)}: ${importe.toFixed(2)}`)
            .join(" | ")
        : e.splitBetweenTravelerIds.map((id) => nombre(id)).join(" | ");

    // Las columnas nuevas van al final: así una hoja montada con la
    // exportación de antes sigue encontrando las suyas donde estaban.
    const header = ["fecha", "hora", "importe_eur", "categoria", "lugar", "dia", "metodo_pago", "tipo", "notas", "pagado_por", "del_bote", "repartido_entre"];
    const rows = expenses.map((e) => [
      e.date,
      e.time,
      e.amountEUR.toFixed(2),
      e.category,
      e.place,
      e.dayId ?? "",
      e.paymentMethod,
      e.kind,
      e.notes.replace(/\n/g, " "),
      e.pagadoDelBote ? "" : nombre(e.paidByTravelerId),
      e.pagadoDelBote ? "sí" : "",
      reparto(e),
    ]);
    return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  },
};
