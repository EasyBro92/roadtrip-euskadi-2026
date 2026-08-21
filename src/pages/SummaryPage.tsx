import { useLiveQuery } from "dexie-react-hooks";
import { PartyPopper } from "lucide-react";
import { useMemo } from "react";
import { ExportService } from "../services/export/ExportService";
import { VehicleService } from "../services/vehicle/VehicleService";
import { db } from "../services/storage/db";
import { useTripStats } from "../hooks/useTripStats";
import { useTripStore } from "../stores/useTripStore";
import { formatEUR } from "../utils/format";

/** Pantalla de celebración final (sección 45). Accesible en cualquier momento desde /resumen. */
export function SummaryPage() {
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const refuels = useTripStore((s) => s.refuels);
  const achievementsState = useTripStore((s) => s.achievementsState);
  const stats = useTripStats();
  const totalPhotos = useLiveQuery(() => db.photos.count(), []) ?? 0;
  const vehicleStats = useMemo(() => VehicleService.computeStats(trip.vehicle, refuels), [trip.vehicle, refuels]);
  const unlockedAchievements = achievementsState.filter((a) => a.unlockedAt).length;

  const isComplete = stats.progressPercentage === 100;

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-8 pb-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--color-navigation)">
        <PartyPopper size={28} color="white" aria-hidden="true" />
      </div>
      <h1 className="mt-3 text-2xl font-bold">{isComplete ? "¡Roadtrip completado!" : "Resumen del viaje"}</h1>
      <p className="mt-1 text-sm text-(--color-text-muted)">{stats.progressPercentage}% del itinerario completado</p>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <SummaryStat label="Paradas visitadas" value={`${stats.visitedStops}/${stats.totalStops}`} />
        <SummaryStat label="Kilómetros" value={`${vehicleStats.totalKm} km`} />
        <SummaryStat label="Fotografías" value={String(totalPhotos)} />
        <SummaryStat label="Logros" value={`${unlockedAchievements}`} />
        <SummaryStat label="Gasto total" value={formatEUR(stats.spentEUR)} />
        <SummaryStat label="Combustible" value={formatEUR(vehicleStats.totalFuelCost)} />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button onClick={() => ExportService.downloadJSON({ trip, stops: Object.values(stopsById), expenses: [], refuels, favorites: [], notes: [], checklist: [], achievementsState, settings: { theme: "light", mapLayer: "classic", categoryVisibility: {}, arrivalRadiusMeters: 150, locationTrackingEnabled: false, batterySaverMode: false, drivingModeEnabled: false, offlineLimitMB: 250, language: "es", reducedMotion: false } })} className="rounded-(--radius-control) bg-(--color-navigation) py-3 text-sm font-semibold text-white">
          Exportar resumen (JSON)
        </button>
        <p className="text-xs text-(--color-text-muted)">El informe en PDF premium está preparado para una futura versión (ver ARCHITECTURE.md).</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-(--color-text-muted)">{label}</p>
    </div>
  );
}
