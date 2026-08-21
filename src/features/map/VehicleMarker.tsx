import L from "leaflet";
import { useMemo } from "react";
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

  const icon = useMemo(() => {
    try {
      const variant = theme === "dark" ? "dark" : "light";
      return L.divIcon({ html: buildCarMarkerHtml(variant, bearing), className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
    } catch {
      return L.divIcon({ html: '<div style="width:14px;height:14px;border-radius:50%;background:#161618;border:2px solid white;"></div>', className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
    }
  }, [bearing, theme]);

  if (!position) return null;

  return <Marker position={[position.latitude, position.longitude]} icon={icon} alt="Vehículo: Volkswagen Golf 1.9 TDI negro" zIndexOffset={1000} />;
}
