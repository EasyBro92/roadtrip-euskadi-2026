import { ArrowLeft, Check, CircleAlert, Loader2, TriangleAlert, WifiOff } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAP_LAYERS } from "../services/map/MapService";
import { pasosIniciales, prepararViaje, type EstadoPaso, type Paso } from "../services/offline/PreparacionService";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";

const ICONO: Record<EstadoPaso, typeof Check> = {
  pendiente: CircleAlert,
  haciendo: Loader2,
  hecho: Check,
  aviso: TriangleAlert,
  fallido: TriangleAlert,
};

const COLOR: Record<EstadoPaso, string> = {
  pendiente: "var(--color-text-muted)",
  haciendo: "var(--color-navigation)",
  hecho: "var(--color-completed)",
  aviso: "var(--color-skipped)",
  fallido: "var(--color-cancelled)",
};

/**
 * Dejar el viaje listo antes de salir.
 *
 * Todo lo que se puede guardar se guarda de una vez, en lugar de ir cayendo
 * a trozos cuando ya estás en la carretera y sin cobertura. Lo que no se
 * puede guardar se dice, en vez de dejarlo a que lo descubras allí.
 */
export function PrepararPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const settings = useSettingsStore((s) => s.settings);

  const [pasos, setPasos] = useState<Paso[]>(pasosIniciales());
  const [preparando, setPreparando] = useState(false);
  const cancelar = useRef(false);

  const capa = MAP_LAYERS.find((l) => l.id === settings.mapLayer) ?? MAP_LAYERS[0];
  const paradas = trip.days.flatMap((d) => d.stopIds.filter((id) => stopsById[id]?.enabled)).length;

  async function preparar() {
    cancelar.current = false;
    setPreparando(true);
    try {
      const finales = await prepararViaje(trip, stopsById, capa.url, setPasos, () => cancelar.current);
      setPasos(finales);
    } finally {
      setPreparando(false);
    }
  }

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="mb-1 text-xl font-bold">Preparar el viaje</h1>
      <p className="mb-4 text-xs text-(--color-text-muted)">
        Descarga y guarda de una vez todo lo que la app puede tener listo para la carretera. Hazlo con wifi antes de salir. Son {paradas} paradas y va despacio a propósito:
        pregunta a servidores de voluntarios, de uno en uno.
      </p>

      <button
        onClick={preparando ? () => (cancelar.current = true) : preparar}
        className={`w-full rounded-full py-3 text-sm font-semibold ${preparando ? "border text-(--color-text)" : "bg-(--color-navigation) text-white"}`}
        style={preparando ? { borderColor: "var(--color-border)" } : undefined}
      >
        {preparando ? "Parar" : "Preparar ahora"}
      </button>

      <ul className="mt-4 space-y-2">
        {pasos.map((paso) => {
          const Icono = ICONO[paso.estado];
          return (
            <li key={paso.id} className="flex items-start gap-2.5 rounded-(--radius-card) border bg-(--color-surface) p-3" style={{ borderColor: "var(--color-border)" }}>
              <Icono
                size={17}
                className={`mt-0.5 shrink-0 ${paso.estado === "haciendo" ? "animate-spin" : ""}`}
                style={{ color: COLOR[paso.estado] }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--color-text)">{paso.titulo}</p>
                <p className="text-xs text-(--color-text-muted)">{paso.detalle}</p>
                {paso.progreso && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
                    <div
                      className="h-full bg-(--color-navigation) transition-[width]"
                      style={{ width: `${(paso.progreso.hechas / Math.max(1, paso.progreso.total)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-start gap-2 rounded-xl bg-(--color-surface-muted) p-3 text-xs text-(--color-text-muted)">
        <WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-1.5">
          <p className="font-medium text-(--color-text)">Qué funciona sin cobertura</p>
          <p>Itinerario, notas, gastos, fotos, documentos, tus valoraciones y todo lo que hayas guardado aquí.</p>
          <p className="font-medium text-(--color-text)">Qué no</p>
          <p>
            Buscar sitios nuevos, "qué hay cerca", sitios de interés del mapa y la previsión de días que no hayas guardado. El mapa se ve sólo donde ya hayas mirado con
            conexión: bajarlo entero va contra las condiciones de uso de OpenStreetMap.
          </p>
        </div>
      </div>
    </div>
  );
}
