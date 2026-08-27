import type L from "leaflet";
import { Bookmark, Navigation, Plus, X } from "lucide-react";
import { NEARBY_CATEGORY_LABEL, type NearbyCategory, type NearbyPlace } from "../../services/places/NearbyService";
import { useOnline } from "../../hooks/useOnline";
import { useNearbyStore } from "../../stores/useNearbyStore";
import { useSavedPlacesStore } from "../../stores/useSavedPlacesStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";
import type { StopCategory } from "../../types";
import { formatKm } from "../../utils/format";
import { googleMapsUrl } from "../../utils/geo";
import { openExternalUrl } from "../../utils/openExternal";

/** Las nueve categorías, en el orden en que se buscan viajando. */
const CATEGORIAS: NearbyCategory[] = [
  "aparcamiento",
  "gasolinera",
  "restaurante",
  "supermercado",
  "farmacia",
  "cajero",
  "hotel",
  "taller",
  "hospital",
];

/**
 * Con qué categoría de parada se guarda cada tipo de sitio cercano.
 *
 * Sólo están los tres que de verdad son una parada del viaje. Una farmacia,
 * un cajero o un taller son una necesidad de ahora mismo, no algo que quieras
 * en tu itinerario: a esos se les ofrece llegar, no añadirlos. Antes había un
 * apaño con "otro" como comodín, que ni siquiera es una categoría válida.
 */
const COMO_PARADA: Partial<Record<NearbyCategory, StopCategory>> = {
  restaurante: "gastronomia",
  hotel: "hotel",
  aparcamiento: "aparcamiento",
};

/**
 * "Qué hay cerca" desde el propio mapa.
 *
 * Ya existía una pantalla en Más con esto, pero cuando estás conduciendo y
 * necesitas una gasolinera no vas a Más: estás mirando el mapa. Buscar alrededor
 * del centro del mapa, y no de tu GPS, es deliberado — así puedes mirar qué hay
 * en Bilbao mientras sigues en Huesca.
 */
export function PanelCerca({ map, onCerrar }: { map: L.Map; onCerrar: () => void }) {
  const { categoria, resultados, cargando, error, buscar, resaltar, limpiar } = useNearbyStore();
  const enLinea = useOnline();
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);

  function centroDelMapa() {
    const c = map.getCenter();
    return { latitude: c.lat, longitude: c.lng };
  }

  function irA(lugar: NearbyPlace) {
    resaltar(lugar.id);
    map.setView([lugar.coordinates.latitude, lugar.coordinates.longitude], Math.max(map.getZoom(), 15));
  }

  function anadir(lugar: NearbyPlace, como: StopCategory) {
    openModal({
      type: "day-picker",
      title: `Añadir ${lugar.name}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, { name: lugar.name, category: como, coordinates: lugar.coordinates });
        pushToast(`${lugar.name} añadida a tu itinerario.`, "success");
      },
    });
  }

  return (
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-3 top-[124px] flex flex-col overflow-hidden rounded-2xl border bg-(--color-surface) shadow-(--shadow-card) sm:inset-x-auto sm:right-16 sm:w-80"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-sm font-medium text-(--color-text)">Qué hay cerca</p>
        <button
          aria-label="Cerrar"
          onClick={() => {
            limpiar();
            onCerrar();
          }}
          className="-mr-1 p-1 text-(--color-text-muted)"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-b p-2.5" style={{ borderColor: "var(--color-border)" }}>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => buscar(centroDelMapa(), c)}
            aria-pressed={categoria === c}
            className={`rounded-full border px-2.5 py-1 text-xs ${categoria === c ? "border-(--color-navigation) bg-(--color-navigation) text-white" : "bg-(--color-surface) text-(--color-text)"}`}
            style={categoria !== c ? { borderColor: "var(--color-border)" } : undefined}
          >
            {NEARBY_CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!enLinea && <Aviso texto="Buscar sitios cercanos necesita conexión. Sin ella no hay nada que consultar." />}
        {enLinea && !categoria && <Aviso texto="Elige qué buscas alrededor del centro del mapa." />}
        {cargando && <Aviso texto="Buscando en OpenStreetMap…" />}

        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-(--color-text-muted)">{error}</p>
            <button
              onClick={() => categoria && buscar(centroDelMapa(), categoria, true)}
              className="mt-2 text-sm font-medium text-(--color-link)"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && categoria && resultados.length === 0 && (
          <Aviso texto={`No hay ${NEARBY_CATEGORY_LABEL[categoria].toLowerCase()} en 5 km a la redonda.`} />
        )}

        <ul>
          {resultados.map((lugar) => {
            const como = COMO_PARADA[lugar.category];
            return (
              <li key={lugar.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
                <button onClick={() => irA(lugar)} className="min-w-0 flex-1 py-1 text-left">
                  <p className="truncate text-sm text-(--color-text)">{lugar.name}</p>
                  <p className="text-xs text-(--color-text-muted)">{formatKm(lugar.distanceMeters)}</p>
                </button>
                <BotonGuardar lugar={lugar} como={como} />
                {como ? (
                  <button
                    onClick={() => anadir(lugar, como)}
                    aria-label={`Añadir ${lugar.name} al itinerario`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-link)"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <Plus size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    onClick={() => openExternalUrl(googleMapsUrl(lugar.name, lugar.coordinates))}
                    aria-label={`Cómo llegar a ${lugar.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-link)"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <Navigation size={15} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {resultados.length > 0 && (
          <p className="px-3 py-2 text-[11px] text-(--color-text-muted)">Datos de OpenStreetMap, mantenidos por voluntarios.</p>
        )}
      </div>
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return <p className="px-4 py-6 text-center text-sm text-(--color-text-muted)">{texto}</p>;
}

/**
 * Guarda el sitio en tus listas de "Quiero ir".
 *
 * Guardar no es añadir al viaje: esto es para lo que te apetece algún día,
 * sin fecha, y sobrevive a cambiar de viaje. El marcador se rellena cuando ya
 * lo tienes, para no guardarlo dos veces sin darte cuenta.
 */
function BotonGuardar({ lugar, como }: { lugar: NearbyPlace; como?: StopCategory }) {
  const guardar = useSavedPlacesStore((s) => s.guardar);
  const lugares = useSavedPlacesStore((s) => s.lugares);
  const pushToast = useUIStore((s) => s.pushToast);

  const guardado = lugares.some(
    (p) =>
      p.nombre.trim().toLowerCase() === lugar.name.trim().toLowerCase() &&
      p.coordinates.latitude.toFixed(4) === lugar.coordinates.latitude.toFixed(4),
  );

  return (
    <button
      onClick={() => {
        if (guardado) return;
        guardar({ nombre: lugar.name, coordinates: lugar.coordinates, categoria: como });
        pushToast(`${lugar.name} guardado en "Quiero ir".`, "success");
      }}
      aria-label={guardado ? `${lugar.name} ya está guardado` : `Guardar ${lugar.name}`}
      aria-pressed={guardado}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-(--color-link)"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Bookmark size={15} fill={guardado ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
