import { ArrowLeft, CloudDownload, Info } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAP_LAYERS } from "../services/map/MapService";
import { OfflineService } from "../services/offline/OfflineService";
import { medirCobertura } from "../services/offline/tileCoverage";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";
import type { OfflinePackage } from "../types";

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OfflinePage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [pkg, setPkg] = useState<OfflinePackage | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    const result = await OfflineService.buildPackage(trip, Object.values(stopsById), settings.offlineLimitMB * 1024 * 1024);
    setPkg(result);
    setDownloading(false);
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Contenido offline</h1>

      <div className="mb-4 flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-3 text-xs text-(--color-text-muted)">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Se guarda el itinerario, textos, fotos que hayas subido y rutas ya calculadas. Las teselas del mapa se cachean automáticamente a medida que las visitas (no se descargan en bloque, para
          respetar las condiciones de uso de OpenStreetMap). Ver limitaciones en <strong>LIMITATIONS.md</strong>.
        </p>
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-medium">Límite de espacio: {settings.offlineLimitMB} MB</span>
        <input
          type="range"
          min={50}
          max={500}
          step={25}
          value={settings.offlineLimitMB}
          onChange={(e) => updateSettings({ offlineLimitMB: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-(--radius-control) bg-(--color-navigation) py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        <CloudDownload size={17} aria-hidden="true" /> {downloading ? "Preparando…" : "Descargar viaje offline"}
      </button>

      {pkg && (
        <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-3 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
          {pkg.status === "error" ? (
            <p className="text-sm text-(--color-cancelled)">Error: {pkg.errorMessage}</p>
          ) : (
            <>
              <p className="text-sm font-semibold">Paquete listo</p>
              <ul className="mt-1 space-y-0.5 text-xs text-(--color-text-muted)">
                <li>Itinerario y textos: incluidos</li>
                <li>Fotos propias: {pkg.includesHeroPhotos ? "incluidas" : "no incluidas"}</li>
                <li>Rutas precalculadas: {pkg.includesPrecomputedRoutes ? "incluidas" : "no incluidas"}</li>
                <li>Teselas de mapa: {pkg.includesMapTiles ? "incluidas" : "según se visiten (caché incremental)"}</li>
              </ul>
              <p className="mt-2 text-sm">
                Tamaño estimado: <strong>{formatMB(pkg.estimatedSizeBytes)}</strong> / {formatMB(pkg.limitBytes)}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
                <div className="h-full bg-(--color-navigation)" style={{ width: `${Math.min(100, (pkg.estimatedSizeBytes / pkg.limitBytes) * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      <CoberturaDelMapa />
    </div>
  );
}

/**
 * Cuánto de tu ruta se ve sin conexión.
 *
 * No descarga nada: mira lo que el navegador ya guardó al pasar tú por ahí.
 * Bajarse las teselas de una zona entera va contra la política de uso de
 * OpenStreetMap y de CARTO, así que la app no lo hace — pero sí puede decirte
 * la verdad sobre lo que tienes antes de salir de casa.
 */
function CoberturaDelMapa() {
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const settings = useSettingsStore((s) => s.settings);

  const [porDia, setPorDia] = useState<{ dia: number; titulo: string; porcentaje: number }[] | null>(null);
  const [midiendo, setMidiendo] = useState(false);

  const capa = MAP_LAYERS.find((l) => l.id === settings.mapLayer) ?? MAP_LAYERS[0];

  async function medir() {
    setMidiendo(true);
    try {
      const resultado = [];
      for (const [i, day] of trip.days.entries()) {
        const puntos = day.stopIds
          .map((id) => stopsById[id])
          .filter((s) => s?.enabled)
          .map((s) => s.coordinates);
        const { porcentaje } = await medirCobertura(puntos, capa.url);
        resultado.push({ dia: i + 1, titulo: day.city || day.title, porcentaje });
      }
      setPorDia(resultado);
    } finally {
      setMidiendo(false);
    }
  }

  return (
    <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-4" style={{ borderColor: "var(--color-border)" }}>
      <h2 className="text-sm font-semibold text-(--color-text)">¿Se verá el mapa sin cobertura?</h2>
      <p className="mt-1 text-xs text-(--color-text-muted)">
        El mapa guarda lo que ya has mirado con conexión. Abre el mapa de cada día antes de salir y esto te dirá cuánto tienes cubierto.
      </p>

      <button
        onClick={medir}
        disabled={midiendo}
        className="mt-3 rounded-full bg-(--color-navigation) px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {midiendo ? "Comprobando…" : "Comprobar cobertura"}
      </button>

      {porDia && (
        <ul className="mt-3 space-y-2">
          {porDia.map((d) => (
            <li key={d.dia}>
              <div className="flex justify-between text-xs">
                <span className="truncate text-(--color-text)">
                  Día {d.dia} · {d.titulo}
                </span>
                <span className="shrink-0 font-medium text-(--color-text-muted)">{d.porcentaje}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
                <div
                  className="h-full"
                  style={{
                    width: `${d.porcentaje}%`,
                    background: d.porcentaje >= 80 ? "var(--color-completed)" : d.porcentaje >= 40 ? "var(--color-skipped)" : "var(--color-cancelled)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
