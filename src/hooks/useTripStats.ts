import { useMemo } from "react";
import { useTripStore } from "../stores/useTripStore";
import { haversineDistanceMeters } from "../utils/geo";
import { percentage } from "../utils/format";

export function useTripStats() {
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const checklist = useTripStore((s) => s.checklist);
  const expenses = useTripStore((s) => s.expenses);

  return useMemo(() => {
    const orderedStops = trip.days.flatMap((day) => day.stopIds.map((id) => stopsById[id]).filter((s) => s && s.enabled));

    let estimatedKm = 0;
    for (let i = 1; i < orderedStops.length; i++) {
      estimatedKm += haversineDistanceMeters(orderedStops[i - 1].coordinates, orderedStops[i].coordinates) / 1000;
    }

    const totalStops = orderedStops.length;
    const visitedStops = orderedStops.filter((s) => s.visited).length;
    const totalHotels = orderedStops.filter((s) => s.category === "hotel").length;
    const totalStadiums = orderedStops.filter((s) => s.category === "estadio").length;
    const checklistPercentage = percentage(checklist.filter((c) => c.checked).length, checklist.length);
    const spentEUR = expenses.filter((e) => e.kind === "actual").reduce((sum, e) => sum + e.amountEUR, 0);

    return {
      totalDays: trip.days.length,
      totalStops,
      visitedStops,
      progressPercentage: percentage(visitedStops, totalStops),
      totalHotels,
      totalStadiums,
      estimatedKm: Math.round(estimatedKm),
      checklistPercentage,
      spentEUR,
      budgetEUR: trip.budgetEUR,
    };
  }, [trip, stopsById, checklist, expenses]);
}
