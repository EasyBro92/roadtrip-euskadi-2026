import {
  BedDouble,
  Binoculars,
  Building2,
  Camera,
  Castle,
  CircleParking,
  Home,
  Landmark,
  MapPin,
  Mountain,
  ScrollText,
  Trees,
  Trophy,
  Umbrella,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { StopCategory } from "../types";
import { thumbStyle } from "../utils/categoryGradient";

/**
 * El icono de cada categoría de parada.
 *
 * Google Maps, TripAdvisor y Booking enseñan todos un símbolo dentro de la
 * miniatura, y no por adorno: en una lista de treinta paradas el icono se lee
 * antes que el nombre, y dice de un vistazo si lo siguiente es una comida, un
 * hotel o un mirador. Aquí sólo había un cuadrado de color, y el color por sí
 * solo hay que aprendérselo.
 */
const ICONOS: Record<StopCategory, LucideIcon> = {
  naturaleza: Trees,
  paisaje: Mountain,
  fotografia: Camera,
  mirador: Binoculars,
  gastronomia: UtensilsCrossed,
  hotel: BedDouble,
  estadio: Trophy,
  cultura: Landmark,
  ciudad: Building2,
  pueblo: Home,
  historia: ScrollText,
  aparcamiento: CircleParking,
  playa: Umbrella,
  castillo: Castle,
};

interface CategoryThumbProps {
  category: StopCategory;
  /** Foto real de la parada, si la hay: manda sobre el icono. */
  heroImage?: string;
  /** Tamaño y forma, en clases: "h-12 w-12 rounded-xl". */
  className?: string;
  iconSize?: number;
}

/**
 * La miniatura de una parada: su foto si la tiene, y si no el degradado de su
 * categoría con el icono encima.
 *
 * Con foto no se dibuja el icono: taparía justo lo que se quiere ver.
 */
export function CategoryThumb({ category, heroImage, className = "h-12 w-12 rounded-xl", iconSize = 22 }: CategoryThumbProps) {
  const Icon = ICONOS[category] ?? MapPin;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={thumbStyle(heroImage, category)}
      aria-hidden="true"
    >
      {/*
       * Blanco a media opacidad, no del todo: sobre el degradado un blanco
       * puro pesa más que el nombre de la parada, que es lo que se lee.
       */}
      {!heroImage && <Icon size={iconSize} className="text-white/85" strokeWidth={1.75} />}
    </div>
  );
}
