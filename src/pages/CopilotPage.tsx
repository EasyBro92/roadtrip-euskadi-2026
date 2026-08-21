import { ArrowLeft, CloudRain, Info, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CopilotService } from "../services/copilot/CopilotService";
import { useLocationStore } from "../stores/useLocationStore";
import { useTripStore } from "../stores/useTripStore";
import type { CopilotEngineMode, CopilotSuggestion } from "../types";

const KIND_LABEL: Record<string, string> = {
  "next-stop": "Siguiente parada",
  "skip-stop": "Podrías saltarte",
  "meal-time": "Hora de comer",
  parking: "Aparcamiento",
  "photo-spot": "Fotografía",
  "scenic-route": "Ruta panorámica",
  "return-to-hotel": "Vuelta al hotel",
  "day-overloaded": "Día cargado",
  "rain-alternative": "Plan de lluvia",
};

export function CopilotPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const expenses = useTripStore((s) => s.expenses);
  const updateTripSettings = useTripStore((s) => s.updateTripSettings);
  const setCurrentStop = useTripStore((s) => s.setCurrentStop);
  const position = useLocationStore((s) => s.position);

  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [mode, setMode] = useState<CopilotEngineMode>("local");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const spent = expenses.filter((e) => e.kind === "actual").reduce((sum, e) => sum + e.amountEUR, 0);
    const result = await CopilotService.getSuggestions({
      trip,
      stops: Object.values(stopsById),
      now: new Date(),
      currentPosition: position,
      todayExpenses: expenses.filter((e) => e.date === today),
      remainingBudgetEUR: trip.budgetEUR - spent,
      rainModeActive: trip.settings.rainModeGlobal,
    });
    setSuggestions(result.suggestions);
    setMode(result.mode);
    setLoading(false);
  }, [trip, stopsById, expenses, position]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>

      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles size={20} className="text-(--color-navigation)" aria-hidden="true" /> Copiloto
        </h1>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-border)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Actualizar
        </button>
      </div>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        {mode === "local"
          ? "Motor local basado en reglas: analiza tu día, la hora, el presupuesto y las paradas pendientes. Sin conexión ni datos en tiempo real."
          : "Sugerencias generadas por el backend de IA configurado."}
      </p>

      <label className="mb-4 flex items-center justify-between rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <span className="flex items-center gap-2 text-sm">
          <CloudRain size={17} className="text-(--color-navigation)" aria-hidden="true" /> Modo lluvia
        </span>
        <input
          type="checkbox"
          checked={trip.settings.rainModeGlobal}
          onChange={(e) => updateTripSettings({ rainModeGlobal: e.target.checked })}
          className="h-5 w-5"
        />
      </label>

      {loading && <p className="text-sm text-(--color-text-muted)">Analizando tu viaje…</p>}

      {!loading && suggestions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-(--radius-card) bg-(--color-surface-muted) py-10 text-center">
          <Info size={22} className="text-(--color-text-muted)" aria-hidden="true" />
          <p className="max-w-[240px] text-sm text-(--color-text-muted)">
            Ahora mismo no hay nada que recomendarte. Selecciona una parada en el mapa o empieza el día para recibir sugerencias.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s) => (
          <article key={s.id} className="rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            <span className="inline-block rounded-full bg-(--color-navigation)/10 px-2.5 py-0.5 text-[11px] font-medium text-(--color-navigation)">
              {KIND_LABEL[s.kind] ?? s.kind}
            </span>
            <h2 className="mt-2 text-sm font-medium text-(--color-text)">{s.title}</h2>
            <p className="mt-0.5 text-sm text-(--color-text)">{s.message}</p>
            {/* Cada sugerencia muestra siempre su motivo: el copiloto nunca
                debe parecer una caja negra (sección 37 del encargo). */}
            <p className="mt-2 text-xs italic text-(--color-text-muted)">Por qué: {s.reason}</p>
            {s.relatedStopId && stopsById[s.relatedStopId] && (
              <button
                onClick={() => {
                  setCurrentStop(s.relatedStopId!);
                  navigate("/mapa");
                }}
                className="mt-3 rounded-full bg-(--color-navigation) px-3.5 py-1.5 text-xs font-medium text-white"
              >
                Ver en el mapa
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
