import { Car, CircleHelp, CloudDownload, Compass, CornerUpLeft, Flag, ListChecks, MapPinned, NotebookPen, Radar, Settings, Share2, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTripStats } from "../hooks/useTripStats";
import { useTripStore } from "../stores/useTripStore";
import { formatEUR } from "../utils/format";

interface MoreItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const GROUPS: { title: string; items: MoreItem[] }[] = [
  {
    title: "Durante el viaje",
    items: [
      { to: "/mas/copiloto", label: "Copiloto", description: "Recomendaciones según hora, día y presupuesto", icon: Sparkles },
      { to: "/mas/cerca", label: "Cerca de mí", description: "Gasolineras, talleres, farmacias y más", icon: Radar },
      { to: "/mas/notas", label: "Notas del viaje", description: "Todo lo que has escrito, con búsqueda", icon: NotebookPen },
    ],
  },
  {
    title: "El viaje",
    items: [
      { to: "/resumen", label: "Resumen del viaje", description: "Estadísticas y celebración final", icon: Flag },
      { to: "/mas/lugares", label: "Lugares opcionales", description: "Añade paradas a cualquier día", icon: MapPinned },
      { to: "/mas/regreso", label: "Regreso a Girona", description: "Compara rutas de vuelta y su coste", icon: CornerUpLeft },
      { to: "/mas/favoritos", label: "Favoritos", description: "Lo que has guardado", icon: Star },
      { to: "/mas/logros", label: "Logros", description: "Desbloquea hitos del roadtrip", icon: Trophy },
    ],
  },
  {
    title: "Preparación",
    items: [
      { to: "/mas/mi-golf", label: "Mi Golf", description: "Consumo, repostajes y estadísticas", icon: Car },
      { to: "/mas/checklist", label: "Checklist", description: "Documentación, vehículo y equipaje", icon: ListChecks },
      { to: "/mas/offline", label: "Contenido offline", description: "Descarga el viaje para la carretera", icon: CloudDownload },
    ],
  },
  {
    title: "Ajustes y datos",
    items: [
      { to: "/mas/compartir", label: "Compartir y exportar", description: "JSON, GPX, GeoJSON y QR", icon: Share2 },
      { to: "/mas/configuracion", label: "Configuración", description: "Fechas, tema, ubicación y privacidad", icon: Settings },
      { to: "/mas/ayuda", label: "Ayuda", description: "Preguntas frecuentes", icon: CircleHelp },
    ],
  },
];

export function MorePage() {
  const navigate = useNavigate();
  const stats = useTripStats();
  const trip = useTripStore((s) => s.trip);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <h1 className="mb-4 text-xl font-bold">Más</h1>

      {/* Tarjeta de progreso, para que "Más" no sea solo un menú. */}
      <div className="mb-5 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-(--color-navigation)" aria-hidden="true" />
          <p className="text-sm font-medium">{trip.name}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
          <div className="h-full rounded-full bg-(--color-progress) transition-all" style={{ width: `${stats.progressPercentage}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-muted)">
          <span>{stats.progressPercentage}% completado</span>
          <span>{stats.visitedStops}/{stats.totalStops} paradas</span>
          <span>{formatEUR(stats.spentEUR)} de {formatEUR(stats.budgetEUR)}</span>
        </div>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">{group.title}</h2>
          <div className="overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            {group.items.map((item, index) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-(--color-surface-muted) ${index > 0 ? "border-t" : ""}`}
                style={index > 0 ? { borderColor: "var(--color-border)" } : undefined}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-navigation)/10">
                  <item.icon size={19} className="text-(--color-navigation)" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-(--color-text)">{item.label}</span>
                  <span className="block truncate text-xs text-(--color-text-muted)">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
