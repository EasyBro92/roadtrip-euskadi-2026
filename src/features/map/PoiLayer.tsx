import L from "leaflet";
import { Bookmark, Plus, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import type { Poi } from "../../services/places/PoiService";
import { usePoiStore } from "../../stores/usePoiStore";
import { useSavedPlacesStore } from "../../stores/useSavedPlacesStore";
import { useTripStore } from "../../stores/useTripStore";
import { useUIStore } from "../../stores/useUIStore";

/**
 * Punto apagado, más discreto que las paradas de tu viaje.
 *
 * Un rombo pequeño y gris: tiene que verse que está ahí sin competir con tu
 * ruta. Si los sitios sugeridos gritasen igual que tus paradas, el mapa
 * dejaría de decirte de un vistazo por dónde vas.
 */
function icono(elegido: boolean): L.DivIcon {
  const lado = elegido ? 14 : 10;
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:${lado}px;height:${lado}px;
      transform:rotate(45deg);
      background:${elegido ? "var(--color-culture)" : "var(--color-text-muted)"};
      border:2px solid var(--color-surface);
      opacity:${elegido ? 1 : 0.75};
    "></span>`,
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado / 2],
  });
}

/** Recuadro visible del mapa, en el orden que espera Overpass. */
function recuadroDe(map: L.Map) {
  const b = map.getBounds();
  return { sur: b.getSouth(), oeste: b.getWest(), norte: b.getNorth(), este: b.getEast() };
}

export function PoiLayer() {
  const map = useMap();
  const { activa, pois, elegido, buscar, elegir, ultimoRecuadro } = usePoiStore();

  const normal = useMemo(() => icono(false), []);
  const grande = useMemo(() => icono(true), []);

  // Primera carga al encender la capa. Después ya no se recarga sola: mover
  // el mapa dispararía una consulta por cada arrastre.
  useEffect(() => {
    if (activa && !ultimoRecuadro) buscar(recuadroDe(map));
  }, [activa, ultimoRecuadro, buscar, map]);

  // Al cerrar la capa se cierra también la ficha que hubiera abierta.
  useMapEvents({ click: () => elegir(null) });

  if (!activa) return null;

  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.coordinates.latitude, poi.coordinates.longitude]}
          icon={poi.id === elegido?.id ? grande : normal}
          alt={poi.name}
          title={poi.name}
          eventHandlers={{ click: () => elegir(poi) }}
        />
      ))}
    </>
  );
}

/**
 * Ficha pequeña del sitio tocado, sobre el mapa.
 *
 * Va fuera de `PoiLayer` porque aquello vive dentro del contenedor de Leaflet
 * y esto es una tarjeta normal de la interfaz.
 */
export function FichaPoi() {
  const elegido = usePoiStore((s) => s.elegido);
  const elegir = usePoiStore((s) => s.elegir);
  const guardar = useSavedPlacesStore((s) => s.guardar);
  const lugares = useSavedPlacesStore((s) => s.lugares);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const addStop = useTripStore((s) => s.addStop);
  const viajeActivo = useTripStore((s) => s.trip.name);

  if (!elegido) return null;

  const guardado = lugares.some(
    (p) =>
      p.nombre.trim().toLowerCase() === elegido.name.trim().toLowerCase() &&
      p.coordinates.latitude.toFixed(4) === elegido.coordinates.latitude.toFixed(4),
  );

  function anadir(poi: Poi) {
    openModal({
      type: "day-picker",
      title: `Añadir ${poi.name}`,
      message: `Se añadirá a "${viajeActivo}". ¿A qué día?`,
      onPick: (dayId) => {
        addStop(dayId, { name: poi.name, category: "cultura", coordinates: poi.coordinates });
        pushToast(`${poi.name} añadida a tu itinerario.`, "success");
      },
    });
  }

  return (
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-[620] rounded-2xl border bg-(--color-surface) p-3 shadow-(--shadow-card) sm:inset-x-auto sm:left-3 sm:w-72"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-(--color-text)">{elegido.name}</p>
          <p className="text-xs text-(--color-text-muted)">{elegido.tipo}</p>
        </div>
        <button aria-label="Cerrar" onClick={() => elegir(null)} className="-mr-1 -mt-1 p-1 text-(--color-text-muted)">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex gap-3">
        <button onClick={() => anadir(elegido)} className="flex items-center gap-1 text-xs font-medium text-(--color-link)">
          <Plus size={13} aria-hidden="true" /> Añadir al viaje
        </button>
        <button
          onClick={() => {
            if (guardado) return;
            guardar({ nombre: elegido.name, coordinates: elegido.coordinates, categoria: "cultura" });
            pushToast(`${elegido.name} guardado en "Quiero ir".`, "success");
          }}
          className="flex items-center gap-1 text-xs font-medium text-(--color-link)"
        >
          <Bookmark size={13} fill={guardado ? "currentColor" : "none"} aria-hidden="true" />
          {guardado ? "Guardado" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
