import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { useCocheStore } from "../../stores/useCocheStore";

/**
 * El coche en el mapa.
 *
 * Cuadrado y oscuro, distinto de las gotas de colores de las paradas y del
 * punto azul de "qué hay cerca": buscándolo con prisa en una pantalla llena
 * de marcadores, lo que hace falta es que no se parezca a nada más.
 */
function icono(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:10px;
      background:var(--color-text);
      border:2.5px solid var(--color-surface);
      box-shadow:0 2px 6px rgba(0,0,0,.4);
    "><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-surface)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function CocheMarker() {
  const coche = useCocheStore((s) => s.coche);
  const marca = useMemo(() => icono(), []);

  if (!coche) return null;

  return (
    <Marker
      position={[coche.coordinates.latitude, coche.coordinates.longitude]}
      icon={marca}
      alt="Dónde has dejado el coche"
      title="Tu coche"
    />
  );
}
