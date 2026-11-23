import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Marker, useMap } from "react-leaflet";
import type { Poi } from "../../services/places/PoiService";
import { useLugarStore } from "../../stores/useLugarStore";
import { usePoiStore } from "../../stores/usePoiStore";
import { categoriaDeTipoOsm } from "./categoriaDeLugar";

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

const idDe = (poi: Poi) => `poi:${poi.id}`;

/** La clave OSM ("castle") se deduce de la etiqueta legible que ya trae el sitio. */
const CLAVE_DE_TIPO: Record<string, string> = {
  Museo: "museum",
  Mirador: "viewpoint",
  Castillo: "castle",
  Ruinas: "ruins",
  Monumento: "monument",
  Iglesia: "church",
  Monasterio: "monastery",
  Yacimiento: "archaeological_site",
  Memorial: "memorial",
};

function lugarDePoi(poi: Poi) {
  return {
    id: idDe(poi),
    nombre: poi.name,
    tipo: poi.tipo,
    categoria: categoriaDeTipoOsm(CLAVE_DE_TIPO[poi.tipo]),
    coordinates: poi.coordinates,
    origen: "interes" as const,
  };
}

export function PoiLayer() {
  const map = useMap();
  const { activa, pois, buscar, ultimoRecuadro } = usePoiStore();
  const lugar = useLugarStore((s) => s.lugar);
  const elegirLugar = useLugarStore((s) => s.elegir);

  const normal = useMemo(() => icono(false), []);
  const grande = useMemo(() => icono(true), []);

  // Primera carga al encender la capa. Después ya no se recarga sola: mover
  // el mapa dispararía una consulta por cada arrastre.
  useEffect(() => {
    if (activa && !ultimoRecuadro) buscar(recuadroDe(map));
  }, [activa, ultimoRecuadro, buscar, map]);

  if (!activa) return null;

  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.coordinates.latitude, poi.coordinates.longitude]}
          icon={lugar?.id === idDe(poi) ? grande : normal}
          alt={poi.name}
          title={poi.name}
          eventHandlers={{ click: () => elegirLugar(lugarDePoi(poi)) }}
        />
      ))}
    </>
  );
}
