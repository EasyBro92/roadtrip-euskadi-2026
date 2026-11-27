import {
  ArrowLeft,
  Check,
  Download,
  Info,
  Lock,
  Map as MapIcon,
  MapPin,
  Palette,
  Plus,
  Shield,
  Trash2,
  Trophy,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
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
import { ExportService } from "../services/export/ExportService";
import { MAP_LAYERS } from "../services/map/MapService";
import { generateId } from "../utils/id";
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
  const expenses = useTripStore((s) => s.expenses);
  const aportaciones = useTripStore((s) => s.aportaciones);

  function anadirViajero() {
    const usados = new Set(trip.travelers.map((t) => t.color));
    const color = COLORES_VIAJERO.find((c) => !usados.has(c)) ?? COLORES_VIAJERO[trip.travelers.length % COLORES_VIAJERO.length];
    setTripMeta({ travelers: [...trip.travelers, { id: generateId("traveler"), name: `Viajero ${trip.travelers.length + 1}`, color }] });
  }

  /*
   * Quitar a alguien que ya tiene gastos o ha puesto dinero en el bote
   * descuadraría las cuentas sin avisar: quién debe a quién saldría mal y no
   * sabrías por qué. Se impide y se explica qué hacer antes.
   */
  function quitarViajero(id: string, nombre: string) {
    if (trip.travelers.length <= 1) {
      pushToast("El viaje necesita al menos un viajero.", "info");
      return;
    }
    const enGastos = expenses.some(
      (e) => e.paidByTravelerId === id || e.splitBetweenTravelerIds.includes(id) || (e.splitCustomEUR && id in e.splitCustomEUR),
    );
    const enBote = aportaciones.some((a) => a.travelerId === id);
    if (enGastos || enBote) {
      pushToast(`${nombre} tiene gastos${enBote ? " o dinero en el bote" : ""}. Cámbialos a otra persona antes de quitarlo.`, "error");
      return;
    }
    openModal({
      type: "confirm",
      title: `Quitar a ${nombre}`,
      message: "Dejará de salir en los gastos y en el reparto.",
      onConfirm: () => setTripMeta({ travelers: trip.travelers.filter((t) => t.id !== id) }),
    });
  }

  function exportarCopia() {
    const state = useTripStore.getState();
    ExportService.downloadJSON({
      trip: state.trip,
      stops: Object.values(state.stopsById),
      expenses: state.expenses,
      refuels: state.refuels,
      favorites: state.favorites,
      notes: state.notes,
      checklist: state.checklist,
      achievementsState: state.achievementsState,
      settings,
      aportaciones: state.aportaciones,
      valoraciones: useRatingsStore.getState().valoraciones,
      sitiosGuardados: { listas: useSavedPlacesStore.getState().listas, lugares: useSavedPlacesStore.getState().lugares },
    });
    pushToast("Copia descargada. Guárdala fuera del móvil.", "success");
  }

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
    // Las cuatro tablas, no dos: las reservas guardadas y los horarios en
    // caché sobrevivían a "borrar todos los datos".
    await Promise.all([db.photos.clear(), db.historySnapshots.clear(), db.documents.clear(), db.placeDetails.clear()]);
    /*
     * Se recarga la app. Los demás almacenes (puntuaciones, sitios guardados,
     * coche aparcado) siguen en memoria con lo de antes y lo volverían a
     * escribir al primer cambio: lo borrado reaparecía. Recargando arrancan
     * todos de lo que hay guardado, que ya es nada.
     */
    StorageService.clearAll();
    window.location.assign(import.meta.env.BASE_URL);
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="-ml-2 mb-2 flex h-11 items-center gap-1.5 rounded-full pl-2 pr-4 text-sm font-medium text-(--color-text) active:bg-(--color-surface-muted)">
        <ArrowLeft size={20} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-2xl font-bold">Configuración</h1>
      <p className="mb-5 text-sm text-(--color-text-muted)">Los cambios se guardan solos al salir de cada campo.</p>

      <Section title="El viaje" icono={MapPin}>
        <CampoTexto etiqueta="Nombre del viaje" valor={trip.name} alGuardar={(v) => v.trim() && setTripMeta({ name: v.trim() })} />
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-(--color-text-muted)">Fecha de inicio</span>
          <input
            type="date"
            value={trip.startDate}
            onChange={(e) => {
              if (!e.target.value) return;
              recalculateDatesFromStart(e.target.value);
              pushToast("Fechas del viaje recalculadas.", "success");
            }}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
          <span className="mt-1 block text-xs text-(--color-text-muted)">Mueve todos los días y paradas; el diario se adapta solo.</span>
        </label>
        <CampoTexto
          etiqueta="Presupuesto total (€)"
          valor={String(trip.budgetEUR)}
          tipo="number"
          alGuardar={(v) => setTripMeta({ budgetEUR: Math.max(0, Number(v.replace(",", ".")) || 0) })}
        />
      </Section>

      <Section title="Viajeros" icono={Users}>
        <ul className="space-y-2">
          {trip.travelers.map((traveler) => (
            <li key={traveler.id} className="flex items-center gap-2">
              <SelectorColor
                color={traveler.color}
                onChange={(color) => setTripMeta({ travelers: trip.travelers.map((t) => (t.id === traveler.id ? { ...t, color } : t)) })}
              />
              <div className="min-w-0 flex-1">
                <CampoTexto
                  etiqueta={`Nombre de ${traveler.name}`}
                  ocultarEtiqueta
                  valor={traveler.name}
                  alGuardar={(v) => v.trim() && setTripMeta({ travelers: trip.travelers.map((t) => (t.id === traveler.id ? { ...t, name: v.trim() } : t)) })}
                />
              </div>
              <button
                onClick={() => quitarViajero(traveler.id, traveler.name)}
                aria-label={`Quitar a ${traveler.name}`}
                className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--color-text-muted) active:bg-(--color-surface-muted)"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <button onClick={anadirViajero} className="flex h-10 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-(--color-link)">
          <Plus size={17} aria-hidden="true" /> Añadir viajero
        </button>
      </Section>

      <Section title="Apariencia" icono={Palette}>
        <Segmentado
          opciones={(["light", "dark", "auto"] as ThemeMode[]).map((mode) => ({ id: mode, label: mode === "light" ? "Claro" : mode === "dark" ? "Oscuro" : "Automático" }))}
          elegido={settings.theme}
          onChange={(id) => updateSettings({ theme: id as ThemeMode })}
        />
        <p className="mb-2 mt-4 text-sm text-(--color-text-muted)">Idioma</p>
        <Segmentado opciones={IDIOMAS.map((id) => ({ id, label: ETIQUETA_IDIOMA[id] }))} elegido={settings.language} onChange={(id) => updateSettings({ language: id as never })} />
        {/* Honestidad por delante: la traducción va por pantallas y lo que
            falta se ve en castellano, no roto ni en blanco. */}
        <p className="mt-2 text-xs text-(--color-text-muted)">El inglés está a medias: lo que aún no está traducido se ve en castellano.</p>
      </Section>

      <Section title="Mapa" icono={MapIcon}>
        <p className="mb-2 text-sm text-(--color-text-muted)">Tipo de mapa</p>
        <div className="grid grid-cols-2 gap-2">
          {MAP_LAYERS.map((capa) => {
            const activa = settings.mapLayer === capa.id;
            return (
              <button
                key={capa.id}
                onClick={() => updateSettings({ mapLayer: capa.id })}
                aria-pressed={activa}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${activa ? "border-(--color-navigation) bg-(--color-navigation)/10 font-medium text-(--color-link)" : "text-(--color-text)"}`}
                style={activa ? undefined : { borderColor: "var(--color-border)" }}
              >
                {capa.label}
                {activa && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-3">
          <Toggle label="Evitar peajes en las rutas" checked={settings.evitarPeajes ?? false} onChange={(v) => updateSettings({ evitarPeajes: v })} />
          <Toggle label="Ahorro de batería (menos precisión)" checked={settings.batterySaverMode} onChange={(v) => updateSettings({ batterySaverMode: v })} />
          <label className="block text-sm">
            <span className="mb-1 block text-(--color-text-muted)">Radio de llegada: {settings.arrivalRadiusMeters} m</span>
            <input type="range" min={50} max={500} step={25} value={settings.arrivalRadiusMeters} onChange={(e) => updateSettings({ arrivalRadiusMeters: Number(e.target.value) })} className="w-full accent-(--color-navigation)" />
          </label>
          <Toggle label="Reducir interacciones al conducir" checked={settings.drivingModeEnabled} onChange={(v) => updateSettings({ drivingModeEnabled: v })} />
          <p className="text-xs text-(--color-text-muted)">Esta app es orientativa: no la manipules mientras conduces.</p>
        </div>
      </Section>

      <Section title="Edición del itinerario" icono={Lock}>
        <Segmentado
          opciones={(["none", "confirm", "pin"] as EditLockMode[]).map((mode) => ({ id: mode, label: mode === "none" ? "Sin bloqueo" : mode === "confirm" ? "Confirmación" : "PIN" }))}
          elegido={trip.settings.editLockMode}
          onChange={(id) => updateTripSettings({ editLockMode: id as EditLockMode })}
        />
      </Section>

      <Section title="Gamificación" icono={Trophy}>
        <Toggle label="Activar logros" checked={trip.settings.gamificationEnabled} onChange={(v) => updateTripSettings({ gamificationEnabled: v })} />
      </Section>

      <Section title="Copia de seguridad" icono={Wallet}>
        <p className="mb-3 text-xs text-(--color-text-muted)">
          Todo vive sólo en este móvil. Descarga una copia de vez en cuando: si se pierde el móvil o se borra la app, es lo único que te queda.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={exportarCopia} className="flex items-center justify-center gap-2 rounded-xl bg-(--color-navigation) px-3 py-2.5 text-sm font-medium text-white">
            <Download size={15} aria-hidden="true" /> Exportar copia
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
            <Upload size={15} aria-hidden="true" /> Importar copia (JSON)
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
      </Section>

      <Section title="Privacidad" icono={Shield}>
        <p className="mb-3 text-xs text-(--color-text-muted)">Todos los datos se guardan localmente en este dispositivo. Ubicación y cámara solo se usan con tu permiso explícito.</p>
        <button
          onClick={() => openModal({ type: "confirm", title: "Borrar todos los datos", message: "Esta acción no se puede deshacer. Se borrará el viaje, fotos, gastos y ajustes.", onConfirm: handleDeleteAllData })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-(--color-cancelled) py-2.5 text-sm font-medium text-(--color-cancelled)"
        >
          <Trash2 size={15} aria-hidden="true" /> Borrar todos los datos
        </button>
      </Section>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-(--color-text-muted)">
        <Info size={13} aria-hidden="true" /> Easy Travel · versión del {__APP_VERSION__}
      </p>
    </div>
  );
}

const COLORES_VIAJERO = ["#2563EB", "#DB2777", "#16A34A", "#F59E0B", "#7C3AED", "#0EA5E9", "#EF4444", "#14B8A6"];

function Section({ title, icono: Icono, children }: { title: string; icono: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--color-text)">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-navigation)/12 text-(--color-link)" aria-hidden="true">
          <Icono size={15} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Un campo de texto que guarda al salir de él (o al pulsar Intro), no con
 * cada letra.
 *
 * Antes el nombre del viaje se guardaba tecla a tecla: borrar para reescribir
 * dejaba durante un momento un viaje sin nombre en Mis viajes, y el
 * presupuesto pasaba por 0 al borrar la cifra. Al guardar se ve un "Guardado"
 * que se va solo, para saber que ha quedado.
 */
function CampoTexto({
  etiqueta,
  valor,
  alGuardar,
  tipo = "text",
  ocultarEtiqueta,
}: {
  etiqueta: string;
  valor: string;
  alGuardar: (valor: string) => void;
  tipo?: "text" | "number";
  ocultarEtiqueta?: boolean;
}) {
  const [borrador, setBorrador] = useState(valor);
  const [anterior, setAnterior] = useState(valor);
  const [guardadoN, setGuardadoN] = useState(0);

  // Si el valor cambia desde fuera (importar una copia), el campo lo refleja.
  if (valor !== anterior) {
    setAnterior(valor);
    setBorrador(valor);
  }

  function guardar() {
    if (borrador === valor) return;
    alGuardar(borrador);
    setGuardadoN((n) => n + 1);
  }

  return (
    <label className="mb-3 block text-sm">
      <span className={ocultarEtiqueta ? "sr-only" : "mb-1 flex items-center justify-between text-(--color-text-muted)"}>
        {etiqueta}
        {!ocultarEtiqueta && guardadoN > 0 && (
          <span key={guardadoN} className="guardado-aparece flex items-center gap-1 text-xs font-medium text-(--color-progress)">
            <Check size={12} aria-hidden="true" /> Guardado
          </span>
        )}
      </span>
      <input
        type={tipo}
        inputMode={tipo === "number" ? "decimal" : undefined}
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="w-full rounded-xl border px-3 py-2.5 text-sm"
        style={{ borderColor: "var(--color-border)" }}
      />
    </label>
  );
}

function SelectorColor({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  return (
    <label className="relative mb-3 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full" style={{ background: color }} title="Cambiar color">
      <span className="sr-only">Color</span>
      <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
  );
}

function Segmentado({ opciones, elegido, onChange }: { opciones: { id: string; label: string }[]; elegido: string; onChange: (id: string) => void }) {
  return (
    <div className="flex rounded-full bg-(--color-surface-muted) p-1" role="radiogroup">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={elegido === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-all duration-200 ${elegido === o.id ? "bg-(--color-surface) text-(--color-text) shadow-(--shadow-card)" : "text-(--color-text-muted)"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-(--color-border) transition-colors duration-200 peer-checked:bg-(--color-navigation)" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
