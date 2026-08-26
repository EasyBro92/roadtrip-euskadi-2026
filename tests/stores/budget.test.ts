import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";

const store = () => useTripStore.getState();

beforeEach(() => {
  useTripStore.setState((s) => ({ trip: { ...s.trip, budgetEUR: 900, budgetByCategoryEUR: {} } }));
});

describe("presupuesto del viaje", () => {
  it("cambia el total", () => {
    store().setBudget(1200);
    expect(store().trip.budgetEUR).toBe(1200);
  });

  it("no acepta un total negativo", () => {
    // Un presupuesto en negativo dejaría la barra y el "quedan" sin sentido.
    store().setBudget(-50);
    expect(store().trip.budgetEUR).toBe(0);
  });

  it("pone un tope a una categoría", () => {
    store().setCategoryBudget("restaurante", 250);
    expect(store().trip.budgetByCategoryEUR?.restaurante).toBe(250);
  });

  it("un tope de cero quita el tope en vez de guardarlo", () => {
    // Guardar un 0 se leería como "no puedes gastar nada aquí", que no es
    // lo que quiere decir alguien que borra el número.
    store().setCategoryBudget("hotel", 300);
    store().setCategoryBudget("hotel", 0);

    expect(store().trip.budgetByCategoryEUR?.hotel).toBeUndefined();
  });

  it("null también quita el tope", () => {
    store().setCategoryBudget("peaje", 40);
    store().setCategoryBudget("peaje", null);

    expect(store().trip.budgetByCategoryEUR?.peaje).toBeUndefined();
  });

  it("los topes de otras categorías no se tocan", () => {
    store().setCategoryBudget("hotel", 300);
    store().setCategoryBudget("restaurante", 250);
    store().setCategoryBudget("hotel", 0);

    expect(store().trip.budgetByCategoryEUR).toEqual({ restaurante: 250 });
  });
});
