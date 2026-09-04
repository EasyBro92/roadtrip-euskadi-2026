import { BookImage, Bookmark, Car, ChevronsUpDown, FileText, Globe2, HardDrive, CircleHelp, CloudDownload, Compass, CornerUpLeft, Flag, ListChecks, MapPinned, NotebookPen, Radar, Settings, Share2, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useT } from "../hooks/useT";
import { useTripStats } from "../hooks/useTripStats";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
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
      { to: "/mas/documentos", label: "Reservas y documentos", description: "PDFs y localizadores, disponibles sin cobertura", icon: FileText },
      { to: "/mas/notas", label: "Notas del viaje", description: "Todo lo que has escrito, con búsqueda", icon: NotebookPen },
    ],
  },
  {
    title: "El viaje",
    items: [
      { to: "/mas/album", label: "Álbum del viaje", description: "El viaje entero seguido, para enseñarlo o guardarlo", icon: BookImage },
      { to: "/resumen", label: "Resumen del viaje", description: "Estadísticas y celebración final", icon: Flag },
      { to: "/mas/lugares", label: "Lugares opcionales", description: "Añade paradas a cualquier día", icon: MapPinned },
      { to: "/mas/regreso", label: "Regreso a Girona", description: "Compara rutas de vuelta y su coste", icon: CornerUpLeft },
      { to: "/mas/guardados", label: "Quiero ir", description: "Sitios guardados en tus propias listas", icon: Bookmark },
      { to: "/mas/favoritos", label: "Favoritos", description: "Paradas que has marcado en este viaje", icon: Star },
      { to: "/mas/visitados", label: "Dónde has estado", description: "El mapa de todo lo que has visitado", icon: Globe2 },
      { to: "/mas/valoraciones", label: "Mis valoraciones", description: "Lo que has puntuado y las reseñas que escribiste", icon: Star },
      { to: "/mas/logros", label: "Logros", description: "Desbloquea hitos del roadtrip", icon: Trophy },
    ],
  },
  {
    title: "Preparación",
    items: [
      { to: "/mas/mi-golf", label: "Mi Golf", description: "Consumo, repostajes y estadísticas", icon: Car },
      { to: "/mas/checklist", label: "Checklist", description: "Documentación, vehículo y equipaje", icon: ListChecks },
      { to: "/mas/preparar", label: "Preparar el viaje", description: "Déjalo todo listo antes de salir, con wifi", icon: CloudDownload },
      { to: "/mas/offline", label: "Contenido offline", description: "Espacio, límites y cobertura del mapa", icon: HardDrive },
    ],
  },
  {
    title: "Ajustes y datos",
    items: [
      {
        to: "/viajes",
        label: "Mis viajes",
        description: "Todos tus viajes, y crear uno nuevo",
        icon: Compass,
      },
      { to: "/mas/compartir", label: "Compartir y exportar", description: "JSON, GPX, GeoJSON y QR", icon: Share2 },
      { to: "/mas/configuracion", label: "Configuración", description: "Fechas, tema, ubicación y privacidad", icon: Settings },
      { to: "/mas/ayuda", label: "Ayuda", description: "Preguntas frecuentes", icon: CircleHelp },
    ],
  },
];

export function MorePage() {
  const { t } = useT();
  const navigate = useNavigate();
  const stats = useTripStats();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);

  // La portada sale de la primera parada que tenga foto, en el orden del
  // viaje: la primera de la primera etapa es la que mejor lo representa.
  const portada = trip.days.flatMap((d) => d.stopIds).map((id) => stopsById[id]?.heroImage).find(Boolean);
  const openModal = useUIStore((s) => s.openModal);

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <h1 className="mb-4 text-xl font-bold">Más</h1>

      {/*
       * La tarjeta del viaje, con su foto de portada.
       *
       * Era una línea de texto y una barra de progreso: la pantalla que abre
       * el viaje no enseñaba el viaje. La foto sale de la primera parada que
       * tenga una, que en un viaje montado son casi todas.
       */}
      <div className="mb-5 overflow-hidden rounded-(--radius-card) border bg-(--color-surface) shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        {/* El nombre del viaje abre el selector: "Más" está a un toque desde
            cualquier pantalla, así que cambiar de viaje queda en dos. */}
        <button
          onClick={() => openModal({ type: "trip-switcher" })}
          aria-label={`Viaje actual: ${trip.name}. Cambiar de viaje`}
          className={portada ? "relative block w-full text-left" : "flex w-full items-center gap-2 p-4 pb-0 text-left"}
        >
          {portada ? (
            <>
              <img src={portada} alt="" className="h-28 w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-10">
                <Compass size={17} className="shrink-0 text-white" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">{trip.name}</span>
                <ChevronsUpDown size={16} className="shrink-0 text-white/80" aria-hidden="true" />
              </span>
            </>
          ) : (
            <>
              <Compass size={18} className="shrink-0 text-(--color-link)" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{trip.name}</span>
              <ChevronsUpDown size={16} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
            </>
          )}
        </button>

        <div className="p-4 pt-3">
        <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
          <div className="h-full rounded-full bg-(--color-progress) transition-all" style={{ width: `${stats.progressPercentage}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-muted)">
          <span>{stats.progressPercentage}% completado</span>
          <span>{stats.visitedStops}/{stats.totalStops} paradas</span>
          <span>{formatEUR(stats.spentEUR)} de {formatEUR(stats.budgetEUR)}</span>
        </div>
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
                  <item.icon size={19} className="text-(--color-link)" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-(--color-text)">{t(item.label)}</span>
                  <span className="block truncate text-xs text-(--color-text-muted)">{t(item.description)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
