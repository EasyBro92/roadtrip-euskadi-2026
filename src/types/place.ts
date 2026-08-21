import type {
  Coordinates,
  DataSource,
  ID,
  PhotographyRating,
  StopCategory,
  Timestamped,
} from "./common";

export type BookingStatus = "not-booked" | "booked" | "pending-confirmation" | "cancelled";

/** Opción de aparcamiento asociada a una parada o ciudad. */
export interface ParkingOption {
  id: ID;
  name: string;
  address?: string;
  walkingDistanceMeters?: number;
  priceInfo?: string;
  maxHeightMeters?: number;
  schedule?: string;
  googleMapsUrl?: string;
  source: DataSource;
  userAdded: boolean;
}

/** Recomendación gastronómica de una parada/zona. */
export interface RestaurantOption {
  id: ID;
  name: string;
  typicalDish?: string;
  tier: "economica" | "tradicional" | "especial";
  priceEstimateEUR?: number;
  distanceMeters?: number;
  googleMapsUrl?: string;
  favorite: boolean;
  visited: boolean;
  notes: string;
  actualCostEUR?: number;
  source: DataSource;
}

/** Alojamiento propuesto o alternativo para una noche del viaje. */
export interface HotelOption {
  id: ID;
  name: string;
  address?: string;
  priceEstimateEUR?: number;
  category?: string;
  breakfastIncluded?: boolean;
  hasParking?: boolean;
  distanceToCenterMeters?: number;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  bookingStatus: BookingStatus;
  notes: string;
  actualCostEUR?: number;
  role: "propuesto" | "alternativa-economica" | "alternativa-aparcamiento";
  source: DataSource;
}

/** Estadio de fútbol incluido en el itinerario. */
export interface StadiumInfo {
  id: ID;
  team: string;
  address?: string;
  hasGuidedTour: boolean;
  tourDurationMinutes?: number;
  tourPriceEUR?: number;
  schedule?: string;
  hasMuseum: boolean;
  hasShop: boolean;
  officialUrl?: string;
  googleMapsUrl?: string;
  bookingStatus: BookingStatus;
  infoPendingVerification: boolean;
}

/**
 * Lugar opcional de la biblioteca estilo Tripadvisor: no forma parte de la
 * ruta principal hasta que el usuario lo añade explícitamente.
 */
export interface Place extends Timestamped {
  id: ID;
  name: string;
  category: StopCategory;
  coordinates: Coordinates;
  region: string;
  photographyRating: PhotographyRating;
  gastronomyInterest: PhotographyRating;
  shortDescription: string;
  heroImage?: string;
  distanceFromRouteKm?: number;
  extraTimeMinutes?: number;
  recommendedDurationMinutes: number;
  internalRating: PhotographyRating;
  isMustSee: boolean;
  tags: string[];
  savedForLater: boolean;
  addedToRoute: boolean;
  source: DataSource;
}
