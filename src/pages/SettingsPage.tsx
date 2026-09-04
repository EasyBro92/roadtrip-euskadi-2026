import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/storage/db";
import { validateExportedState } from "../services/storage/schema";
import { StorageService } from "../services/storage/StorageService";
import { ETIQUETA_IDIOMA, IDIOMAS } from "../i18n";
import { useRatingsStore } from "../stores/useRatingsStore";
import { useSavedPlacesStore } from "../stores/useSavedPlacesStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { EditLockMode, ThemeMode } from "../types";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const trip = useTripStore((s) => s.trip);
  const setTripMeta = useTripStore((s) => s.setTripMeta);
  const recalculateDatesFromStart = useTripStore((s) => s.recalculateDatesFromStart);
  const updateTripSettings = useTripStore((s) => s.updateTripSettings);
  const importTripData = useTripStore((s) => s.importTripData);
  const resetAllData = useTripStore((s) => s.resetAllData);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = validateExportedState(parsed);
      if (!result.success) {
        pushToast(`Archivo inválido: ${result.error}`, "error");
        return;
      }
      importTripData({
        trip: result.data.trip as never,
        stops: result.data.stops as never,
        expenses: result.data.expenses as never,
        refuels: result.data.refuels as never,
        favorites: result.data.favorites as never,
        notes: result.data.notes as never,
        checklist: result.data.checklist as never,
        achievementsState: result.data.achievementsState as never,
        aportaciones: result.data.aportaciones as never,
      });

      /*
       * Lo que vive en almacenes aparte y antes se perdía al restaurar.
       *
       * Sólo se sustituye lo que venga en el fichero: una copia hecha antes
       * de que esto se exportara no debe borrar las puntuaciones que ya
       * tengas. Las puntuaciones y los sitios guardados no son de un viaje
       * concreto, son tuyos.
       */
      if (result.data.valoraciones) useRatingsStore.getState().reemplazarTodas(result.data.valoraciones as never);
      if (result.data.sitiosGuardados) {
        useSavedPlacesStore.getState().reemplazarTodo(result.data.sitiosGuardados.listas as never, result.data.sitiosGuardados.lugares as never);
      }

      const faltaba = !result.data.aportaciones && (result.data.expenses as { pagadoDelBote?: boolean }[]).some((e) => e.pagadoDelBote);
      pushToast(
        faltaba
          ? "Viaje importado, pero la copia es antigua y no traía el bote: los gastos pagados de él se quedan sin quién los puso."
          : "Viaje importado correctamente.",
        faltaba ? "info" : "success",
      );
    } catch (error) {
      pushToast(`No se pudo importar: ${(error as Error).message}`, "error");
    }
  }

  async function handleDeleteAllData() {
    resetAllData();
    useSettingsStore.getState().resetSettings();
    StorageService.clearAll();
    await db.photos.clear();
    await db.historySnapshots.clear();
    pushToast("Todos los datos se han borrado.", "success");
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-4 text-xl font-bold">Configuración</h1>

      <Section title="El viaje">
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-(--color-text-muted)">Nombre del viaje</span>
          <input
            type="text"
            value={trip.name}
            onChange={(e) => setTripMeta({ name: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-(--color-text-muted)">Fecha de inicio (recalcula todos los días)</span>
          <input
            type="date"
            value={trip.startDate}
            onChange={(e) => {
              if (!e.target.value) return;
              recalculateDatesFromStart(e.target.value);
              pushToast("Fechas del viaje recalculadas.", "success");
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-(--color-text-muted)">Presupuesto total (€)</span>
          <input
            type="number"
            inputMode="decimal"
            value={trip.budgetEUR}
            onChange={(e) => setTripMeta({ budgetEUR: Number(e.target.value) || 0 })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
        </label>
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Cambiar la fecha de inicio desplaza automáticamente todos los días y todas las paradas, y el diario se adapta solo.
        </p>
      </Section>

      <Section title="Viajeros">
        {trip.travelers.map((traveler, index) => (
          <label key={traveler.id} className="mb-2 block text-sm">
            <span className="mb-1 block text-(--color-text-muted)">Viajero {index + 1}</span>
            <input
              type="text"
              value={traveler.name}
              onChange={(e) =>
                setTripMeta({ travelers: trip.travelers.map((t) => (t.id === traveler.id ? { ...t, name: e.target.value } : t)) })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>
        ))}
      </Section>

      <Section title="Apariencia">
        <div className="flex gap-2">
          {(["light", "dark", "auto"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSettings({ theme: mode })}
              className={`flex-1 rounded-lg border py-2 text-sm capitalize ${settings.theme === mode ? "bg-(--color-navigation) text-white border-(--color-navigation)" : ""}`}
              style={settings.theme !== mode ? { borderColor: "var(--color-border)" } : undefined}
            >
              {mode === "light" ? "Claro" : mode === "dark" ? "Oscuro" : "Automático"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Idioma">
        <div className="flex gap-2">
          {IDIOMAS.map((id) => (
            <button
              key={id}
              onClick={() => updateSettings({ language: id })}
              className={`flex-1 rounded-lg border py-2 text-sm ${settings.language === id ? "bg-(--color-navigation) text-white border-(--color-navigation)" : ""}`}
              style={settings.language !== id ? { borderColor: "var(--color-border)" } : undefined}
            >
              {ETIQUETA_IDIOMA[id]}
            </button>
          ))}
        </div>
        {/* Honestidad por delante: la traducción va por pantallas y lo que
            falta se ve en castellano, no roto ni en blanco. */}
        <p className="mt-2 text-xs text-(--color-text-muted)">
          El inglés está a medias: lo que aún no está traducido se ve en castellano.
        </p>
      </Section>

      <Section title="Ubicación">
        <Toggle label="Ahorro de batería (menos precisión)" checked={settings.batterySaverMode} onChange={(v) => updateSettings({ batterySaverMode: v })} />
        <label className="mt-2 block text-sm">
          <span className="mb-1 block text-(--color-text-muted)">Radio de llegada: {settings.arrivalRadiusMeters} m</span>
          <input type="range" min={50} max={500} step={25} value={settings.arrivalRadiusMeters} onChange={(e) => updateSettings({ arrivalRadiusMeters: Number(e.target.value) })} className="w-full" />
        </label>
      </Section>

      <Section title="Modo conducción">
        <Toggle label="Reducir interacciones al conducir" checked={settings.drivingModeEnabled} onChange={(v) => updateSettings({ drivingModeEnabled: v })} />
        <p className="mt-1 text-xs text-(--color-text-muted)">Esta app es orientativa: no la manipules mientras conduces.</p>
      </Section>

      <Section title="Edición del itinerario">
        <div className="flex gap-2">
          {(["none", "confirm", "pin"] as EditLockMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateTripSettings({ editLockMode: mode })}
              className={`flex-1 rounded-lg border py-2 text-xs ${trip.settings.editLockMode === mode ? "bg-(--color-navigation) text-white border-(--color-navigation)" : ""}`}
              style={trip.settings.editLockMode !== mode ? { borderColor: "var(--color-border)" } : undefined}
            >
              {mode === "none" ? "Sin bloqueo" : mode === "confirm" ? "Confirmación" : "PIN"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Gamificación">
        <Toggle label="Activar logros" checked={trip.settings.gamificationEnabled} onChange={(v) => updateTripSettings({ gamificationEnabled: v })} />
      </Section>

      <Section title="Datos">
        <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
          <Upload size={15} aria-hidden="true" /> Importar copia (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
      </Section>

      <Section title="Privacidad">
        <p className="mb-2 text-xs text-(--color-text-muted)">Todos los datos se guardan localmente en este dispositivo. Ubicación y cámara solo se usan con tu permiso explícito.</p>
        <button
          onClick={() => openModal({ type: "confirm", title: "Borrar todos los datos", message: "Esta acción no se puede deshacer. Se borrará el viaje, fotos, gastos y ajustes.", onConfirm: handleDeleteAllData })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-(--color-cancelled) py-2.5 text-sm font-medium text-(--color-cancelled)"
        >
          <Trash2 size={15} aria-hidden="true" /> Borrar todos los datos
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <p className="mb-2 text-xs font-semibold uppercase text-(--color-text-muted)">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" />
    </label>
  );
}
