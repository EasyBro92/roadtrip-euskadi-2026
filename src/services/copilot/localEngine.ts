import type { Coordinates, CopilotSuggestion, Expense, Stop, Trip } from "../../types";
import { formatKm } from "../../utils/format";
import { haversineDistanceMeters } from "../../utils/geo";
import { generateId } from "../../utils/id";

export interface CopilotContext {
  trip: Trip;
  stops: Stop[];
  now: Date;
  currentPosition: Coordinates | null;
  todayExpenses: Expense[];
  remainingBudgetEUR: number | null;
  rainModeActive: boolean;
}

function stopsOfDay(ctx: CopilotContext, dayId: string): Stop[] {
  const day = ctx.trip.days.find((d) => d.id === dayId);
  if (!day) return [];
  return day.stopIds.map((id) => ctx.stops.find((s) => s.id === id)).filter((s): s is Stop => Boolean(s) && s!.enabled).sort((a, b) => a.order - b.order);
}

function suggestion(partial: Omit<CopilotSuggestion, "id" | "generatedBy" | "generatedAt">): CopilotSuggestion {
  return { ...partial, id: generateId("suggestion"), generatedBy: "local", generatedAt: new Date().toISOString() };
}

/**
 * Motor de reglas 100% local: nunca inventa datos en tiempo real, cada
 * sugerencia declara su `reason` explícita (sección 37: "mostrar siempre el
 * motivo"). Es el motor por defecto y siempre disponible, sin red ni clave.
 */
export function generateLocalSuggestions(ctx: CopilotContext): CopilotSuggestion[] {
  const results: CopilotSuggestion[] = [];
  const currentDayId = ctx.trip.currentDayId;
  if (!currentDayId) return results;

  const day = ctx.trip.days.find((d) => d.id === currentDayId);
  const dayStops = stopsOfDay(ctx, currentDayId);
  const currentStop = ctx.stops.find((s) => s.id === ctx.trip.currentStopId) ?? null;
  const pendingStops = dayStops.filter((s) => !s.visited && s.category !== "hotel");
  const hotelStop = dayStops.find((s) => s.category === "hotel");

  // 1. Próxima parada recomendada. Si ya estás en la última del día, se
  // recupera cualquier parada pendiente anterior en vez de callar: quedarse
  // sin sugerencias no le sirve de nada al usuario.
  const currentIndex = currentStop ? dayStops.findIndex((s) => s.id === currentStop.id) : -1;
  const nextInOrder = dayStops.slice(currentIndex + 1).find((s) => !s.visited && s.category !== "hotel");
  const nextStop = nextInOrder ?? pendingStops.find((s) => s.id !== currentStop?.id);
  if (nextStop) {
    const distanceText = ctx.currentPosition ? ` (${formatKm(haversineDistanceMeters(ctx.currentPosition, nextStop.coordinates))})` : "";
    results.push(
      suggestion({
        kind: "next-stop",
        title: nextInOrder ? "Próxima parada recomendada" : "Aún te queda pendiente",
        message: `${nextStop.name}${distanceText}`,
        reason: nextInOrder
          ? `Es la siguiente parada habilitada del día ${day ? day.index + 1 : ""} según el orden del itinerario.`
          : "Ya estás en la última parada del día, pero esta sigue sin marcarse como visitada.",
        relatedStopId: nextStop.id,
        priority: 80,
      }),
    );
  }

  // 2. Día sobrecargado → priorizar imprescindibles.
  if (day?.isOverloaded) {
    const optionalPending = pendingStops.filter((s) => s.optional || s.priority === "medium" || s.priority === "low");
    if (optionalPending.length > 0) {
      results.push(
        suggestion({
          kind: "day-overloaded",
          title: "Día demasiado cargado",
          message: `Hay ${optionalPending.length} paradas de prioridad media/baja hoy. Considera convertirlas en opcionales desde el editor.`,
          reason: `El día tiene más de 6 paradas planificadas (${dayStops.length}), por encima del margen recomendado de 3-5 paradas principales.`,
          priority: 90,
        }),
      );

      const lowestPriority = optionalPending.find((s) => s.priority === "low") ?? optionalPending.find((s) => s.priority === "medium");
      if (lowestPriority) {
        results.push(
          suggestion({
            kind: "skip-stop",
            title: "Conviene omitir una parada",
            message: `${lowestPriority.name} podría saltarse hoy sin perder lo esencial del día.`,
            reason: `Prioridad "${lowestPriority.priority}" en un día sobrecargado; el resto de paradas de mayor prioridad requieren más tiempo.`,
            relatedStopId: lowestPriority.id,
            priority: 70,
          }),
        );
      }
    }
  }

  // 3. Hora de comer.
  const hour = ctx.now.getHours();
  const isLunchWindow = hour >= 13 && hour < 15;
  const isDinnerWindow = hour >= 20 && hour < 22;
  const alreadyAteToday = ctx.todayExpenses.some((e) => e.category === "restaurante");
  if ((isLunchWindow || isDinnerWindow) && !alreadyAteToday) {
    const withFood = currentStop?.restaurantOptions.length ? currentStop : nextStop?.restaurantOptions.length ? nextStop : dayStops.find((s) => s.restaurantOptions.length > 0);
    if (withFood) {
      const budgetTight = ctx.remainingBudgetEUR != null && ctx.remainingBudgetEUR < 60;
      const option = budgetTight ? withFood.restaurantOptions.find((r) => r.tier === "economica") ?? withFood.restaurantOptions[0] : withFood.restaurantOptions[0];
      results.push(
        suggestion({
          kind: "meal-time",
          title: "Hora de comer",
          message: `${option.name} en ${withFood.name}${option.typicalDish ? ` — ${option.typicalDish}` : ""}`,
          reason: budgetTight
            ? `Son las ${hour}:00 y el presupuesto restante es ajustado, así que se prioriza una opción económica.`
            : `Son las ${hour}:00 y todavía no hay ningún gasto de restaurante registrado hoy.`,
          relatedStopId: withFood.id,
          priority: 85,
        }),
      );
    }
  }

  // 4. Aparcamiento recomendado.
  if (currentStop && currentStop.parkingOptions.length > 0) {
    results.push(
      suggestion({
        kind: "parking",
        title: "Aparcamiento recomendado",
        message: currentStop.parkingOptions[0].name,
        reason: `Aparcamiento más cercano registrado para ${currentStop.name}.`,
        relatedStopId: currentStop.id,
        priority: 60,
      }),
    );
  }

  // 5. Lugar fotográfico cercano.
  const photoSpot = [currentStop, nextStop].filter((s): s is Stop => Boolean(s)).find((s) => s.photographyRating >= 4 && !s.visited);
  if (photoSpot) {
    const isDuskOrDawn = hour <= 8 || hour >= 19;
    results.push(
      suggestion({
        kind: "photo-spot",
        title: "Lugar fotográfico cercano",
        message: `${photoSpot.name}${photoSpot.photoTip?.goldenHour && isDuskOrDawn ? ` — buena luz ahora (${photoSpot.photoTip.goldenHour})` : ""}`,
        reason: `Valor fotográfico ${photoSpot.photographyRating}/5${isDuskOrDawn ? " y hora de golden hour" : ""}.`,
        relatedStopId: photoSpot.id,
        priority: isDuskOrDawn ? 75 : 50,
      }),
    );
  }

  // 6. Alternativa de lluvia.
  if (ctx.rainModeActive) {
    const withAlternative = [currentStop, nextStop].filter((s): s is Stop => Boolean(s)).find((s) => s.rainAlternative);
    if (withAlternative) {
      results.push(
        suggestion({
          kind: "rain-alternative",
          title: "Alternativa para lluvia",
          message: withAlternative.rainAlternative!,
          reason: "Modo lluvia activado manualmente para hoy.",
          relatedStopId: withAlternative.id,
          priority: 95,
        }),
      );
    }
  }

  // 7. Volver al hotel.
  if (hotelStop && !hotelStop.visited && hour >= 19 && pendingStops.length <= 1) {
    results.push(
      suggestion({
        kind: "return-to-hotel",
        title: "Hora de volver al hotel",
        message: hotelStop.name,
        reason: `Son las ${hour}:00 y queda poco itinerario pendiente hoy.`,
        relatedStopId: hotelStop.id,
        priority: 65,
      }),
    );
  }

  // 8. Resumen del día. Siempre presente para que el copiloto nunca quede
  // vacío: aunque no haya nada urgente, decir en qué punto vas es útil.
  if (day) {
    const visitedCount = dayStops.filter((s) => s.visited).length;
    const allDone = pendingStops.length === 0 && dayStops.length > 0;
    results.push(
      suggestion({
        kind: "next-stop",
        title: allDone ? `Día ${day.index + 1} completado` : `Cómo va el día ${day.index + 1}`,
        message: allDone
          ? "Has visitado todo lo planificado para hoy. Buen momento para escribir el diario o repasar los gastos."
          : `${visitedCount} de ${dayStops.length} paradas visitadas · ${pendingStops.length} pendientes.`,
        reason: `Resumen calculado sobre las paradas activas del día ${day.index + 1}.`,
        priority: 10,
      }),
    );
  }

  return results.sort((a, b) => b.priority - a.priority);
}
