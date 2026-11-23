import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { ExpenseCategory, StopCategory } from "../../types";
import { fechaLocal, formatEUR } from "../../utils/format";

/** Con qué categoría de gasto se apunta lo pagado en cada tipo de sitio. */
const GASTO_DE: Partial<Record<StopCategory, ExpenseCategory>> = {
  gastronomia: "restaurante",
  hotel: "hotel",
  aparcamiento: "aparcamiento",
  cultura: "entrada",
  castillo: "entrada",
  historia: "entrada",
  estadio: "entrada",
};

/**
 * Apuntar un gasto con un solo dato, el importe, desde cualquier sitio de la
 * app. Lo paga el primer viajero y se reparte entre todos, como en el
 * formulario rápido de Gastos; se puede cambiar después desde allí.
 */
export function pedirGastoRapido(sitio?: { nombre: string; categoria: StopCategory }) {
  const { openModal, pushToast } = useUIStore.getState();
  openModal({
    type: "prompt",
    title: sitio ? `Gasto en ${sitio.nombre}` : "Apuntar un gasto",
    message: "¿Cuánto has pagado? Lo pagas tú y se reparte entre todos; puedes cambiarlo en Gastos.",
    placeholder: "0,00",
    onSubmit: (valor) => {
      const importe = Number(valor.replace(",", "."));
      if (!importe || importe <= 0) {
        pushToast("Escribe un importe mayor que cero.", "error");
        return;
      }
      const { trip, addExpense } = useTripStore.getState();
      const ahora = new Date();
      addExpense({
        date: fechaLocal(ahora),
        time: ahora.toTimeString().slice(0, 5),
        amountEUR: importe,
        category: (sitio && GASTO_DE[sitio.categoria]) ?? "otros",
        place: sitio?.nombre ?? "",
        dayId: trip.currentDayId ?? null,
        stopId: null,
        paidByTravelerId: trip.travelers[0]?.id ?? null,
        splitBetweenTravelerIds: trip.travelers.map((t) => t.id),
        paymentMethod: "tarjeta",
        notes: "",
        receiptPhotoId: null,
        kind: "actual",
      });
      pushToast(sitio ? `${formatEUR(importe)} apuntados en ${sitio.nombre}.` : `${formatEUR(importe)} apuntados.`, "success");
    },
  });
}
