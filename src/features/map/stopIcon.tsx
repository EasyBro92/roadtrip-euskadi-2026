import L from "leaflet";
import { BedDouble, Binoculars, Building2, Camera, Home, Landmark, Mountain, ParkingCircle, ScrollText, Trophy, TreePine, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StopCategory } from "../../types";

const CATEGORY_ICON: Record<StopCategory, LucideIcon> = {
  naturaleza: TreePine,
  fotografia: Camera,
  paisaje: Mountain,
  mirador: Binoculars,
  gastronomia: UtensilsCrossed,
  hotel: BedDouble,
  estadio: Trophy,
  cultura: Landmark,
  ciudad: Building2,
  pueblo: Home,
  historia: ScrollText,
  aparcamiento: ParkingCircle,
  playa: Waves,
  castillo: Landmark,
};

const CATEGORY_HEX: Record<StopCategory, string> = {
  naturaleza: "#14b8a6",
  paisaje: "#14b8a6",
  ciudad: "#0f766e",
  pueblo: "#14b8a6",
  playa: "#0ea5e9",
  fotografia: "#1a73e8",
  mirador: "#1a73e8",
  gastronomia: "#f97316",
  hotel: "#ec4899",
  estadio: "#15803d",
  cultura: "#7c3aed",
  historia: "#7c3aed",
  castillo: "#7c3aed",
  aparcamiento: "#6b7280",
};

const PIN_WIDTH = 30;
const PIN_HEIGHT = 40;

/**
 * Pin en forma de gota estilo Google Maps (a petición del usuario: "copia lo
 * que puedas el estilo de Google Maps"). Se mantiene un color por categoría
 * — es, de hecho, así como el propio Google Maps distingue categorías en su
 * vista "Explorar" — pero con la silueta de gota en vez del círculo anterior.
 * El ancla apunta a la punta inferior de la gota, no al centro, para que
 * marque la coordenada exacta sobre el mapa.
 */
export function buildStopMarkerIcon(category: StopCategory, opts: { visited?: boolean; isCurrent?: boolean } = {}): L.DivIcon {
  const Icon = CATEGORY_ICON[category] ?? Landmark;
  const color = CATEGORY_HEX[category] ?? "#1a73e8";
  const scale = opts.isCurrent ? 1.28 : 1;
  const width = Math.round(PIN_WIDTH * scale);
  const height = Math.round(PIN_HEIGHT * scale);

  const iconSvg = renderToStaticMarkup(<Icon size={13} color="white" strokeWidth={2.5} aria-hidden="true" />);

  const html = `
    <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 2px 3px rgba(32,33,36,0.35));">
      <svg width="${width}" height="${height}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z"
              fill="${color}" stroke="white" stroke-width="1.5" />
      </svg>
      <div style="position:absolute;top:6px;left:0;width:${width}px;display:flex;align-items:center;justify-content:center;">
        ${iconSvg}
      </div>
      ${
        opts.visited
          ? `<div style="position:absolute;bottom:${Math.round(height * 0.42)}px;right:-2px;width:13px;height:13px;border-radius:50%;background:#16A34A;border:2px solid white;"></div>`
          : ""
      }
      ${opts.isCurrent ? `<div style="position:absolute;top:2px;left:2px;width:${width - 4}px;height:${width - 4}px;border-radius:50%;border:2.5px solid white;box-sizing:border-box;"></div>` : ""}
    </div>
  `;

  return L.divIcon({ html, className: "", iconSize: [width, height], iconAnchor: [width / 2, height], popupAnchor: [0, -height] });
}
