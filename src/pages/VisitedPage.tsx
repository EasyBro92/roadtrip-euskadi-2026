import L from "leaflet";
import { ArrowLeft, Share2 } from "lucide-react";
import { useMemo } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { MAP_LAYERS } from "../services/map/MapService";
import { SharingService } from "../services/sharing/SharingService";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTripStore } from "../stores/useTripStore";
import { useUIStore } from "../stores/useUIStore";
import type { Coordinates } from "../types";
import { haversineDistanceMeters } from "../utils/geo";

interface Visitado {
  id: string;
  nombre: string;
  viaje: string;
  coordinates: Coordinates;
}

const PUNTO = L.divIcon({
  className: "",
  html: `<span style="display:block;width:9px;height:9px;border-radius:9999px;background:var(--color-completed);border:2px solid var(--color-surface);box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>`,
  iconSize: [9, 9],
  iconAnchor: [4.5, 4.5],
});

/**
 * Todo lo que has visitado, de todos tus viajes, en un mapa.
 *
 * Se arma con las paradas marcadas como visitadas, del viaje abierto y de los
 * archivados — que guardan sus paradas enteras. No hay nada nuevo que
 * mantener: si marcas una parada como visitada, aparece aquí.
 */
export function VisitedPage() {
  const navigate = useNavigate();
  const trip = useTripStore((s) => s.trip);
  const stopsById = useTripStore((s) => s.stopsById);
  const savedTrips = useTripStore((s) => s.savedTrips);
  const settings = useSettingsStore((s) => s.settings);
  const pushToast = useUIStore((s) => s.pushToast);

  const capa = MAP_LAYERS.find((l) => l.id === settings.mapLayer) ?? MAP_LAYERS[0];

  const visitados = useMemo<Visitado[]>(() => {
    const salida: Visitado[] = [];

    const recoger = (nombreViaje: string, paradas: Record<string, { id: string; name: string; visited?: boolean; coordinates: Coordinates }>) => {
      for (const parada of Object.values(paradas)) {
        if (!parada?.visited) continue;
        salida.push({ id: `${nombreViaje}:${parada.id}`, nombre: parada.name, viaje: nombreViaje, coordinates: parada.coordinates });
      }
    };

    recoger(trip.name, stopsById);
    for (const workspace of Object.values(savedTrips)) recoger(workspace.trip.name, workspace.stopsById);
    return salida;
  }, [trip.name, stopsById, savedTrips]);

  /** Sitios a más de 20 km entre sí: una forma barata de contar "sitios distintos". */
  const localidades = useMemo(() => {
    const centros: Coordinates[] = [];
    for (const v of visitados) {
      if (!centros.some((c) => haversineDistanceMeters(c, v.coordinates) < 20000)) centros.push(v.coordinates);
    }
    return centros.length;
  }, [visitados]);

  const viajes = new Set(visitados.map((v) => v.viaje)).size;

  const centro: [number, number] = visitados.length
    ? [
        visitados.reduce((s, v) => s + v.coordinates.latitude, 0) / visitados.length,
        visitados.reduce((s, v) => s + v.coordinates.longitude, 0) / visitados.length,
      ]
    : [41.9794, 2.8214];

  async function compartir() {
    const texto = `He visitado ${visitados.length} sitios en ${viajes} ${viajes === 1 ? "viaje" : "viajes"}, por ${localidades} zonas distintas.`;
    const resultado = await SharingService.shareSummary(trip, texto);
    if (resultado.kind === "clipboard") pushToast("Resumen copiado al portapapeles.", "success");
    else if (resultado.kind === "unsupported") pushToast(resultado.reason, "error");
  }

  return (
    <div className="safe-x flex h-full flex-col overflow-hidden bg-(--color-bg) px-4 pt-4">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Dónde has estado</h1>
          <p className="text-xs text-(--color-text-muted)">Las paradas que has marcado como visitadas, de todos tus viajes.</p>
        </div>
        {visitados.length > 0 && (
          <button onClick={compartir} className="flex shrink-0 items-center gap-1 text-xs text-(--color-navigation)">
            <Share2 size={12} aria-hidden="true" /> Compartir
          </button>
        )}
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
        <Numero valor={String(visitados.length)} etiqueta="Sitios" />
        <Numero valor={String(localidades)} etiqueta="Zonas" />
        <Numero valor={String(viajes)} etiqueta="Viajes" />
      </div>

      {visitados.length === 0 ? (
        <p className="mt-6 text-sm text-(--color-text-muted)">
          Aún no has marcado ninguna parada como visitada. Toca el círculo de una parada en el Itinerario o en el Diario.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-(--radius-card) border pb-4" style={{ borderColor: "var(--color-border)" }}>
          <MapContainer center={centro} zoom={6} className="h-full w-full" scrollWheelZoom>
            <TileLayer url={capa.url} attribution={capa.attribution} />
            {visitados.map((v) => (
              <Marker key={v.id} position={[v.coordinates.latitude, v.coordinates.longitude]} icon={PUNTO} title={`${v.nombre} · ${v.viaje}`} />
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function Numero({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-(--radius-card) border bg-(--color-surface) p-3 text-center" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-xl font-medium text-(--color-text)">{valor}</p>
      <p className="text-[11px] text-(--color-text-muted)">{etiqueta}</p>
    </div>
  );
}
