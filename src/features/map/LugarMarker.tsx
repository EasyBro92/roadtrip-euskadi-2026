import L from "leaflet";
import { useEffect, useRef } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { GeocodingService } from "../../services/geocoding/GeocodingService";
import { useLugarStore } from "../../stores/useLugarStore";
import { categoriaDeTipoOsm, partirDireccion } from "./categoriaDeLugar";

/** Pin rojo del sitio que estás mirando y que aún no es tuyo, como en Google Maps. */
const PIN = L.divIcon({
  className: "",
  html: `<div class="pin-cae" style="filter:drop-shadow(0 2px 3px rgba(32,33,36,.4))">
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#EA4335" stroke="#B31412" stroke-width="1"/>
      <circle cx="15" cy="15" r="5" fill="#7B0D0B"/>
    </svg></div>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

/**
 * El pin del sitio elegido en el buscador o marcado a mano, y el gesto de
 * mantener pulsado el mapa para marcar un punto.
 *
 * Las paradas, los sitios de interés y "qué hay cerca" ya tienen su propio
 * marcador; esto dibuja sólo lo que no tendría ninguno.
 */
export function LugarMarker() {
  const map = useMap();
  const lugar = useLugarStore((s) => s.lugar);
  const elegir = useLugarStore((s) => s.elegir);
  const pregunta = useRef<AbortController | null>(null);

  useMapEvents({
    // En móvil, mantener pulsado dispara `contextmenu`; con ratón, el botón derecho.
    contextmenu: (e) => {
      const coordinates = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      const id = `mapa:${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`;
      elegir({
        id,
        nombre: "Sitio marcado",
        tipo: `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
        categoria: "cultura",
        coordinates,
        origen: "mapa",
      });

      // Y se le busca nombre. Si no llega, se queda con las coordenadas.
      pregunta.current?.abort();
      const aborto = new AbortController();
      pregunta.current = aborto;
      void GeocodingService.reverse(coordinates, aborto.signal).then((encontrado) => {
        if (!encontrado || aborto.signal.aborted) return;
        if (useLugarStore.getState().lugar?.id !== id) return;
        const { nombre, resto } = partirDireccion(encontrado.displayName);
        elegir({ id, nombre, tipo: resto, categoria: categoriaDeTipoOsm(encontrado.type), coordinates, origen: "mapa" });
      });
    },
    // Tocar el mapa en vacío cierra la ficha, como en cualquier app de mapas.
    click: () => elegir(null),
  });

  useEffect(() => () => pregunta.current?.abort(), []);

  // Al elegir un sitio del buscador, el mapa va hasta él.
  useEffect(() => {
    if (!lugar || lugar.origen !== "busqueda") return;
    map.flyTo([lugar.coordinates.latitude, lugar.coordinates.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [lugar, map]);

  if (!lugar || (lugar.origen !== "busqueda" && lugar.origen !== "mapa")) return null;
  return <Marker key={lugar.id} position={[lugar.coordinates.latitude, lugar.coordinates.longitude]} icon={PIN} alt={lugar.nombre} />;
}
