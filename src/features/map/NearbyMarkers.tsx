import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { useNearbyStore } from "../../stores/useNearbyStore";

/**
 * Marcador de "qué hay cerca": un punto pequeño y neutro, a propósito
 * distinto de las paradas del viaje.
 *
 * Las paradas son tuyas y llevan color de categoría y forma de gota; esto son
 * resultados de una búsqueda pasajera. Si se parecieran, el mapa dejaría de
 * decirte de un vistazo qué es tu ruta y qué no.
 */
function icono(resaltado: boolean): L.DivIcon {
  const tamano = resaltado ? 18 : 13;
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:${tamano}px;height:${tamano}px;border-radius:9999px;
      background:var(--color-navigation);
      border:2.5px solid var(--color-surface);
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    "></span>`,
    iconSize: [tamano, tamano],
    iconAnchor: [tamano / 2, tamano / 2],
  });
}

export function NearbyMarkers() {
  const resultados = useNearbyStore((s) => s.resultados);
  const resaltado = useNearbyStore((s) => s.resaltado);
  const resaltar = useNearbyStore((s) => s.resaltar);

  const normal = useMemo(() => icono(false), []);
  const grande = useMemo(() => icono(true), []);

  return (
    <>
      {resultados.map((lugar) => (
        <Marker
          key={lugar.id}
          position={[lugar.coordinates.latitude, lugar.coordinates.longitude]}
          icon={lugar.id === resaltado ? grande : normal}
          alt={lugar.name}
          title={lugar.name}
          eventHandlers={{ click: () => resaltar(lugar.id) }}
        />
      ))}
    </>
  );
}
