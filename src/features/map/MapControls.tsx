import type L from "leaflet";
import { Car, Compass, Crosshair, Landmark, Layers, ListFilter, LocateFixed, Navigation2, Radar } from "lucide-react";
import { useState } from "react";
import { useStopsOfDay } from "../../hooks/useStopsOfDay";
import { useTap } from "../../hooks/useTap";
import { MAP_LAYERS } from "../../services/map/MapService";
import { useCocheStore } from "../../stores/useCocheStore";
import { useLocationStore } from "../../stores/useLocationStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUIStore } from "../../stores/useUIStore";
import type { StopCategory } from "../../types";
import { usePoiStore } from "../../stores/usePoiStore";
import { PanelCerca } from "./PanelCerca";
import { PanelCoche } from "./PanelCoche";

const LOCATION_ERROR_MESSAGES: Record<string, string> = {
  denied: "Permiso de ubicación denegado. Actívalo en los ajustes del navegador para usar esta función.",
  unavailable: "No se pudo obtener tu posición ahora mismo. Inténtalo de nuevo en unos segundos.",
  timeout: "Se agotó el tiempo esperando tu ubicación. Inténtalo de nuevo.",
  unsupported: "Este navegador no soporta geolocalización.",
};

/**
 * El navegador solo permite geolocalización en "contexto seguro": HTTPS o
 * localhost. Abriendo la app por IP de red local (http://192.168.x.x) el
 * permiso ni siquiera se pide y la llamada falla en silencio — antes esto
 * hacía que los tres botones de GPS pareciesen rotos.
 */
function isSecureForGeolocation(): boolean {
  return window.isSecureContext;
}

const CATEGORY_LABELS: Record<StopCategory, string> = {
  naturaleza: "Naturaleza",
  fotografia: "Fotografía",
  paisaje: "Paisaje",
  mirador: "Mirador",
  gastronomia: "Gastronomía",
  hotel: "Hotel",
  estadio: "Estadio",
  cultura: "Cultura",
  ciudad: "Ciudad",
  pueblo: "Pueblo",
  historia: "Historia",
  aparcamiento: "Aparcamiento",
  playa: "Playa",
  castillo: "Castillo",
};

function ControlButton({ icon: Icon, label, active, onClick, grouped }: { icon: typeof Layers; label: string; active?: boolean; onClick: () => void; grouped?: boolean }) {
  const tap = useTap(onClick);
  return (
    <button
      aria-label={label}
      title={label}
      {...tap}
      className={
        grouped
          ? `flex h-11 w-11 items-center justify-center transition-colors active:bg-(--color-surface-muted) ${active ? "bg-(--color-navigation) text-white" : "bg-(--color-surface) text-(--color-text)"}`
          : `flex h-11 w-11 items-center justify-center rounded-full shadow-(--shadow-card) ${active ? "bg-(--color-navigation) text-white" : "bg-(--color-surface) text-(--color-text)"}`
      }
    >
      <Icon size={19} aria-hidden="true" />
    </button>
  );
}

/** Agrupa botones en una sola "isla" redondeada con separadores, como el clúster de controles de Google Maps. */
function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-(--color-border) overflow-hidden rounded-2xl border shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
      {children}
    </div>
  );
}

/** Controles flotantes del mapa (sección 11): recentrar, capas, categorías, ubicación, brújula. */
export function MapControls({ dayId, map }: { dayId: string; map: L.Map }) {
  const stops = useStopsOfDay(dayId);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const toggleCategoryVisibility = useSettingsStore((s) => s.toggleCategoryVisibility);
  const requestSinglePosition = useLocationStore((s) => s.requestSinglePosition);
  const locationTracking = useLocationStore((s) => s.tracking);
  const startTracking = useLocationStore((s) => s.startTracking);
  const stopTracking = useLocationStore((s) => s.stopTracking);
  const pushToast = useUIStore((s) => s.pushToast);

  const [panel, setPanel] = useState<"none" | "layers" | "categories" | "legend" | "cerca" | "coche">("none");
  const coche = useCocheStore((s) => s.coche);
  const aparcar = useCocheStore((s) => s.aparcar);
  const capaPois = usePoiStore((s) => s.activa);
  const alternarPois = usePoiStore((s) => s.alternar);
  const poisCargando = usePoiStore((s) => s.cargando);
  const poisError = usePoiStore((s) => s.error);
  const buscarPois = usePoiStore((s) => s.buscar);
  const numeroPois = usePoiStore((s) => s.pois.length);
  const [locating, setLocating] = useState(false);

  const enabledStops = stops.filter((s) => s.enabled);
  const usedCategories = Array.from(new Set(enabledStops.map((s) => s.category)));

  function warnInsecureContext(): boolean {
    if (isSecureForGeolocation()) return false;
    pushToast("Tu ubicación solo funciona con HTTPS o en localhost. Abriendo la app por IP de red local, el navegador la bloquea.", "error");
    return true;
  }

  function fitToDay() {
    if (enabledStops.length === 0) {
      pushToast("No hay paradas activas hoy para encuadrar.", "info");
      return;
    }
    map.fitBounds(enabledStops.map((s) => [s.coordinates.latitude, s.coordinates.longitude]), { padding: [48, 48] });
  }

  async function centerOnMe() {
    if (warnInsecureContext()) return;
    setLocating(true);
    const position = await requestSinglePosition();
    setLocating(false);
    if (position) {
      map.flyTo([position.latitude, position.longitude], 15);
      return;
    }
    const reason = useLocationStore.getState().error?.reason ?? "unavailable";
    pushToast(LOCATION_ERROR_MESSAGES[reason] ?? LOCATION_ERROR_MESSAGES.unavailable, "error");
  }

  /*
   * Guardar dónde queda el coche ahora mismo, sobrescribiendo lo que hubiera.
   *
   * Se pide la posición en el momento y no se usa la última conocida: puede
   * ser de hace media hora y de otra calle, y un punto equivocado es peor que
   * ninguno cuando lo estás buscando. Se usa tanto para guardarlo la primera
   * vez como para volver a marcarlo si has movido el coche: antes, con el
   * coche ya guardado, el botón sólo abría o cerraba el panel y no había
   * forma de apuntar la nueva posición sin "olvidar" el coche primero.
   */
  async function marcarCocheAqui() {
    if (warnInsecureContext()) return;

    setLocating(true);
    const position = await requestSinglePosition();
    setLocating(false);

    if (!position) {
      const reason = useLocationStore.getState().error?.reason ?? "unavailable";
      pushToast(LOCATION_ERROR_MESSAGES[reason] ?? LOCATION_ERROR_MESSAGES.unavailable, "error");
      return;
    }
    aparcar(position);
    setPanel("coche");
    pushToast("Apuntado dónde queda el coche.", "success");
  }

  function aparcarAqui() {
    if (coche) {
      setPanel(panel === "coche" ? "none" : "coche");
      return;
    }
    void marcarCocheAqui();
  }

  function toggleFollow() {
    if (locationTracking) {
      stopTracking();
      pushToast("Seguimiento de posición desactivado.", "info");
      return;
    }
    if (warnInsecureContext()) return;
    startTracking(settings.batterySaverMode);
    setTimeout(() => {
      const error = useLocationStore.getState().error;
      if (error) pushToast(LOCATION_ERROR_MESSAGES[error.reason] ?? LOCATION_ERROR_MESSAGES.unavailable, "error");
      else pushToast("Siguiendo tu posición.", "success");
    }, 400);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[560]">
      {/* top-[124px]: por debajo de la tira de días (68px + su altura). A la
          misma altura que ella, la columna tapaba los últimos chips. */}
      <div className="pointer-events-auto absolute right-3 top-[124px] flex flex-col gap-3">
        <ControlGroup>
          <ControlButton grouped icon={Layers} label="Selector de mapa" active={panel === "layers"} onClick={() => setPanel(panel === "layers" ? "none" : "layers")} />
          <ControlButton grouped icon={ListFilter} label="Mostrar u ocultar categorías" active={panel === "categories"} onClick={() => setPanel(panel === "categories" ? "none" : "categories")} />
          <ControlButton grouped icon={Compass} label="Leyenda" active={panel === "legend"} onClick={() => setPanel(panel === "legend" ? "none" : "legend")} />
          <ControlButton grouped icon={Radar} label="Qué hay cerca" active={panel === "cerca"} onClick={() => setPanel(panel === "cerca" ? "none" : "cerca")} />
          <ControlButton grouped icon={Landmark} label={capaPois ? "Ocultar sitios de interés" : "Ver sitios de interés"} active={capaPois} onClick={alternarPois} />
        </ControlGroup>
        <ControlGroup>
          <ControlButton grouped icon={Crosshair} label="Ver ruta completa del día" onClick={fitToDay} />
          <ControlButton grouped icon={LocateFixed} label={locating ? "Buscando ubicación…" : "Mi ubicación"} onClick={centerOnMe} />
          <ControlButton grouped icon={Navigation2} label={locationTracking ? "Dejar de seguir" : "Seguir mi posición"} active={locationTracking} onClick={toggleFollow} />
          <ControlButton grouped icon={Car} label={coche ? "Volver al coche" : "He aparcado aquí"} active={panel === "coche"} onClick={aparcarAqui} />
        </ControlGroup>
      </div>

      {panel === "cerca" && <PanelCerca map={map} onCerrar={() => setPanel("none")} />}
      {panel === "coche" && <PanelCoche map={map} onCerrar={() => setPanel("none")} onActualizar={marcarCocheAqui} />}

      {/* Con la capa encendida, un botón para volver a buscar donde estés
          mirando. Recargar en cada arrastre sería una consulta por gesto. */}
      {capaPois && (
        <div className="pointer-events-auto absolute inset-x-0 top-[124px] flex justify-center px-3">
          <button
            onClick={() => {
              const b = map.getBounds();
              buscarPois({ sur: b.getSouth(), oeste: b.getWest(), norte: b.getNorth(), este: b.getEast() });
            }}
            disabled={poisCargando}
            className="rounded-full border bg-(--color-surface) px-4 py-2 text-xs font-medium text-(--color-link) shadow-(--shadow-card)"
            style={{ borderColor: "var(--color-border)" }}
          >
            {poisCargando ? "Buscando sitios…" : poisError ? "Reintentar" : `Buscar en esta zona${numeroPois > 0 ? ` · ${numeroPois}` : ""}`}
          </button>
        </div>
      )}

      {poisError && capaPois && (
        <div className="pointer-events-none absolute inset-x-0 top-[168px] flex justify-center px-6">
          <p className="rounded-full bg-(--color-surface) px-3 py-1.5 text-center text-[11px] text-(--color-text-muted) shadow-(--shadow-card)">{poisError}</p>
        </div>
      )}

      {panel === "layers" && (
        // Alineado con la columna de controles, que ya está por debajo de la
        // tira de días.
        <div className="pointer-events-auto absolute right-16 top-[124px] w-52 overflow-hidden rounded-2xl border bg-(--color-surface) py-1 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          {MAP_LAYERS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => {
                updateSettings({ mapLayer: layer.id });
                setPanel("none");
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm ${settings.mapLayer === layer.id ? "bg-(--color-surface-muted) font-medium text-(--color-link)" : "text-(--color-text)"}`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      )}

      {panel === "categories" && (
        <div className="pointer-events-auto absolute right-16 top-[124px] max-h-72 w-56 overflow-y-auto rounded-2xl border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">Categorías visibles</p>
          {usedCategories.map((category) => (
            <label key={category} className="flex items-center gap-2 py-1.5 text-sm">
              <input type="checkbox" checked={settings.categoryVisibility[category] !== false} onChange={() => toggleCategoryVisibility(category)} className="h-4 w-4" />
              <span className={`h-2.5 w-2.5 rounded-full category-${category}`} style={{ background: "var(--category-color)" }} />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      )}

      {panel === "legend" && (
        <div className="pointer-events-auto absolute right-16 top-[124px] w-56 rounded-2xl border bg-(--color-surface) p-3 text-sm shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">Leyenda</p>
          <LegendRow color="#9CA3AF" label="Ruta completa" />
          <LegendRow color="#16A34A" label="Tramo recorrido" />
          <LegendRow color="#4285F4" label="Tramo pendiente" />
        </div>
      )}
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="h-1.5 w-6 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
