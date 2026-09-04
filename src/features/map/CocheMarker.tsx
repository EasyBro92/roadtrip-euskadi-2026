import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { useCocheStore } from "../../stores/useCocheStore";
import { useUIStore } from "../../stores/useUIStore";

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

/**
 * El coche en el mapa, con un marcador sin nada dentro.
 *
 * Todos los demás puntos del mapa hacen algo al tocarlos: una parada abre su
 * ficha, un resultado de "qué hay cerca" se resalta. Éste no hacía nada, así
 * que la única forma de quitar el coche era encontrar el botón del coche en
 * la columna de controles — y si no sabías que estaba ahí, tocar el propio
 * icono que tienes delante y que no responda se lee como "esto no se puede
 * quitar".
 *
 * Tocarlo ahora ofrece justo lo que falta: quitarlo. Reposicionarlo sigue
 * siendo cosa del botón de la barra —control fino con el resto de opciones
 * del coche—, y el mensaje lo dice para quien no lo haya visto.
 */
export function CocheMarker() {
  const coche = useCocheStore((s) => s.coche);
  const olvidar = useCocheStore((s) => s.olvidar);
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const marca = useMemo(() => icono(), []);

  if (!coche) return null;

  function quitar() {
    openModal({
      type: "confirm",
      title: "Tu coche",
      message: "¿Quitarlo del mapa? Si lo has movido a otro sitio, vuelve a marcarlo desde el botón del coche en los controles del mapa.",
      confirmLabel: "Quitar del mapa",
      onConfirm: () => {
        olvidar();
        pushToast("Buen viaje.", "success");
      },
    });
  }

  return (
    <Marker
      position={[coche.coordinates.latitude, coche.coordinates.longitude]}
      icon={marca}
      alt="Dónde has dejado el coche"
      title="Tu coche"
      eventHandlers={{ click: quitar }}
    />
  );
}
