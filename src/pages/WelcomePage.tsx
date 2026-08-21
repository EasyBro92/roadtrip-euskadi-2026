import { ArrowLeft, BedDouble, Car, Download, Gauge, MapPinned, Pencil, Settings, Share2, Trophy, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { useTripStats } from "../hooks/useTripStats";
import { useTripStore } from "../stores/useTripStore";
import { formatDateLong, formatEUR } from "../utils/format";

export function WelcomePage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const updateTripSettings = useTripStore((s) => s.updateTripSettings);
  const stats = useTripStats();
  const stopsById = useTripStore((s) => s.stopsById);

  const vehiculo = [trip.vehicle.model, trip.vehicle.engine].filter(Boolean).join(" ").trim();

  /** Foto de portada: la parada con mejor valor fotográfico que tenga imagen. */
  const heroImage = useMemo(() => {
    const best = Object.values(stopsById)
      .filter((s) => s.heroImage && s.enabled)
      .sort((a, b) => b.photographyRating - a.photographyRating)[0];
    return best?.heroImage;
  }, [stopsById]);

  // El salto directo al mapa lo decide ahora la raíz de la app (EntryRedirect).
  // Si siguiera aquí, entrar a propósito en el Resumen desde Mis viajes te
  // expulsaría al mapa sin dejarte verlo.

  return (
    <div className="app-shell safe-top overflow-y-auto bg-(--color-bg)">
      {/* Portada con una foto real del viaje (la de mayor valor fotográfico)
          y degradado oscuro para que el texto blanco siempre se lea. */}
      <div className="relative flex h-72 shrink-0 flex-col justify-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={
            heroImage
              ? { backgroundImage: `url("${heroImage}")` }
              : { background: "linear-gradient(160deg, #1A73E8 0%, #0B4FCC 45%, #16A34A 100%)" }
          }
          aria-hidden="true"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 100%)" }} aria-hidden="true" />

        {/* Salida al nivel de la app. Sin esto, entrar en un viaje sería un
            callejón sin salida: no habría forma de volver a Mis viajes. */}
        <button
          onClick={() => navigate("/viajes")}
          aria-label="Volver a mis viajes"
          className="safe-top absolute left-3 top-3 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="safe-x relative pb-7 text-white">
          <p className="text-sm font-medium opacity-90">
            {formatDateLong(trip.startDate)} — {formatDateLong(trip.endDate)}
          </p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <Users size={13} aria-hidden="true" /> {trip.travelers.length} viajeros
            </span>
            {/* Un viaje recién creado no trae coche: sin esto salía una
                etiqueta con el icono y ningún texto. */}
            {vehiculo && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                <Car size={13} aria-hidden="true" /> {vehiculo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* El panel sube 28px sobre la foto (-mt-7) con esquinas de 28px de
          radio. Con pt-6 el botón caía dentro de esa curva y pisaba la foto:
          hace falta separarlo más que el propio radio para que quede limpio. */}
      <div className="safe-x -mt-7 rounded-t-[28px] bg-(--color-bg) pt-10 pb-6">
        {/* Acción principal arriba del todo, como el botón de indicaciones de Google. */}
        <button
          className="w-full rounded-full bg-(--color-navigation) py-3.5 text-center text-base font-medium text-white shadow-(--shadow-card) transition-transform active:scale-[0.98]"
          onClick={() => navigate("/mapa")}
        >
          {trip.currentStopId ? "Continuar el roadtrip" : "Comenzar roadtrip"}
        </button>

        {/* Progreso del viaje, para que la portada diga algo aunque ya hayas empezado. */}
        {stats.visitedStops > 0 && (
          <div className="mt-4 rounded-(--radius-card) border bg-(--color-surface) p-3.5 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tu progreso</span>
              <span className="text-(--color-text-muted)">{stats.progressPercentage}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
              <div className="h-full rounded-full bg-(--color-progress) transition-all" style={{ width: `${stats.progressPercentage}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-(--color-text-muted)">
              {stats.visitedStops} de {stats.totalStops} paradas visitadas
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {/* Cada tarjeta lleva a la pantalla de la que sale el dato. */}
          <StatCard icon={MapPinned} label="Días" value={String(stats.totalDays)} to="/itinerario" />
          <StatCard icon={Gauge} label="Km estimados" value={`${stats.estimatedKm}`} to="/mapa" />
          <StatCard icon={BedDouble} label="Hoteles" value={String(stats.totalHotels)} to="/itinerario" />
          <StatCard icon={Trophy} label="Estadios" value={String(stats.totalStadiums)} to="/itinerario" />
          <StatCard icon={Wallet} label="Presupuesto" value={formatEUR(stats.budgetEUR)} to="/gastos" />
          <StatCard icon={Settings} label="Preparado" value={`${stats.checklistPercentage}%`} to="/mas/checklist" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <ActionButton icon={Pencil} label="Editar itinerario" onClick={() => navigate("/itinerario")} />
          <ActionButton icon={Download} label="Descargar offline" onClick={() => navigate("/mas/offline")} />
          <ActionButton icon={Share2} label="Compartir" onClick={() => navigate("/mas/compartir")} />
          <ActionButton icon={Settings} label="Configuración" onClick={() => navigate("/mas/configuracion")} />
        </div>

        <label className="mt-5 flex items-center gap-2.5 text-sm text-(--color-text-muted)">
          <input
            type="checkbox"
            checked={trip.settings.skipWelcomeScreen}
            onChange={(e) => updateTripSettings({ skipWelcomeScreen: e.target.checked })}
            className="h-4 w-4"
          />
          Ir directo al mapa la próxima vez
        </label>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-full border bg-(--color-surface) px-3 py-2.5 text-xs font-medium text-(--color-text) transition-transform active:scale-[0.97]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Icon size={15} className="shrink-0 text-(--color-navigation)" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}
