import type { ModoTransporte } from "../features/itinerary/tramos";
import type {
  Coordinates,
  DataSource,
  ID,
  ISODate,
  PhotographyRating,
  Priority,
  StopCategory,
  Timestamped,
  VisitStatus,
} from "./common";
import type { HotelOption, ParkingOption, RestaurantOption, StadiumInfo } from "./place";

export interface PhotoTip {
  bestPoint?: string;
  framingAdvice?: string;
  goldenHour?: "amanecer" | "atardecer" | "indiferente";
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean | "unknown";
  walkingDifficulty: "facil" | "moderada" | "dificil";
  notes?: string;
}

/**
 * Parada del itinerario principal. Es la entidad central del modelo de datos:
 * todo (mapa, panel, editor, copiloto, gastos, fotos) gira en torno a ella.
 */
export interface Stop extends Timestamped {
  id: ID;
  dayId: ID;
  order: number;
  name: string;
  shortName: string;
  category: StopCategory;
  subcategory?: string;
  coordinates: Coordinates;
  date: ISODate;
  recommendedDurationMinutes: number;

  shortDescription: string;
  fullDescription: string;
  highlights: string[];

  photographyRating: PhotographyRating;
  photoTip?: PhotoTip;

  priority: Priority;
  optional: boolean;
  enabled: boolean;
  visited: boolean;
  favorite: boolean;
  visitStatus: VisitStatus;

  expectedCostEUR?: number;
  actualCostEUR?: number;

  /**
   * Cómo llegas a esta parada desde la anterior. Opcional: sin él se deduce
   * de la distancia, así que los viajes ya guardados siguen valiendo.
   */
  modoLlegada?: ModoTransporte;
  openingHours?: string;
  bookingRequired: boolean;
  officialUrl?: string;
  googleMapsUrl: string;

  parkingOptions: ParkingOption[];
  restaurantOptions: RestaurantOption[];
  hotelOptions: HotelOption[];
  stadiumInfo?: StadiumInfo;
  rainAlternative?: string;

  accessibility: AccessibilityInfo;
  walkingDifficulty: "facil" | "moderada" | "dificil";

  tags: string[];
  heroImage?: string;
  gallery: string[];
  photos: ID[];
  userPhotos: ID[];

  notes: string;
  source: DataSource;

  visitedAt?: string;
  arrivalRadiusMeters: number;
}
