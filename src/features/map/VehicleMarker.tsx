import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Marker } from "react-leaflet";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useVehicleAnimationStore } from "../../stores/useVehicleAnimationStore";
import { buildCarMarkerHtml } from "../../utils/carIcon";

/**
 * Marcador del Golf negro (sección 5 y 13). Solo se renderiza cuando hay una
 * posición activa (tras el primer play/salto de parada). El panel inferior
 * nunca debe taparlo: MapPage ajusta el `paddingBottomRight` del mapa según
 * el estado del bottom sheet.
 */
export function VehicleMarker() {
  const position = useVehicleAnimationStore((s) => s.position);
  const bearing = useVehicleAnimationStore((s) => s.bearing);
  const theme = useSettingsStore((s) => s.settings.theme);
  const markerRef = useRef<L.Marker | null>(null);

  // El icono depende solo del tema. Antes dependía también del bearing, que
  // cambia en cada frame: eso recreaba el divIcon y obligaba a Leaflet a
  // reconstruir el SVG entero 60 veces por segundo. Era la causa principal de
  // los tirones, y además anulaba la transición CSS del giro, que no llegaba
  // a ejecutarse nunca porque el elemento desaparecía antes.
  const icon = useMemo(() => {
    try {
      const variant = theme === "dark" ? "dark" : "light";
      return L.divIcon({ html: buildCarMarkerHtml(variant, 0), className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
    } catch {
      return L.divIcon({ html: '<div style="width:14px;height:14px;border-radius:50%;background:#161618;border:2px solid white;"></div>', className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
    }
  }, [theme]);

  // El giro se escribe sobre el elemento ya montado: una asignación de estilo
  // por frame en lugar de reconstruir el marcador, y así la transición del
  // CSS sí suaviza el movimiento.
  useEffect(() => {
    const rotator = markerRef.current?.getElement()?.querySelector<HTMLElement>(".car-rotator");
    if (rotator) rotator.style.transform = `rotate(${bearing}deg)`;
  }, [bearing, icon, position]);

  if (!position) return null;

  return <Marker ref={markerRef} position={[position.latitude, position.longitude]} icon={icon} alt="Vehículo: Volkswagen Golf 1.9 TDI negro" zIndexOffset={1000} />;
}
