import type { HotelOption, ParkingOption, RestaurantOption, Stop } from "../types";
import { googleMapsUrl } from "../utils/geo";

/** Fecha fija usada como `createdAt`/`updatedAt` de los datos semilla (no son ediciones del usuario). */
export const SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

type StopSeedInput = Partial<Stop> &
  Pick<Stop, "id" | "dayId" | "order" | "name" | "category" | "coordinates" | "date" | "shortDescription" | "fullDescription">;

/**
 * Crea una parada con todos los valores por defecto del modelo de datos ya
 * rellenos, para no repetir ~25 campos idénticos en cada una de las ~35
 * paradas del itinerario. Cada campo sigue existiendo (ver `types/stop.ts`);
 * esto es solo para no duplicar literales.
 */
export function createStop(input: StopSeedInput): Stop {
  return {
    shortName: input.name,
    subcategory: undefined,
    recommendedDurationMinutes: 45,
    highlights: [],
    photographyRating: 3,
    priority: "medium",
    optional: false,
    enabled: true,
    visited: false,
    favorite: false,
    visitStatus: "pending",
    expectedCostEUR: undefined,
    actualCostEUR: undefined,
    openingHours: undefined,
    bookingRequired: false,
    officialUrl: undefined,
    googleMapsUrl: googleMapsUrl(input.name, input.coordinates),
    parkingOptions: [],
    restaurantOptions: [],
    hotelOptions: [],
    stadiumInfo: undefined,
    rainAlternative: undefined,
    accessibility: { wheelchairAccessible: "unknown", walkingDifficulty: "facil" },
    walkingDifficulty: "facil",
    tags: [],
    heroImage: undefined,
    gallery: [],
    photos: [],
    userPhotos: [],
    notes: "",
    source: "user",
    visitedAt: undefined,
    arrivalRadiusMeters: 150,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...input,
  };
}

let parkingCounter = 0;
export function createParking(p: Omit<ParkingOption, "id" | "userAdded" | "source"> & { source?: ParkingOption["source"] }): ParkingOption {
  parkingCounter += 1;
  return { id: `parking-${parkingCounter}`, userAdded: false, source: p.source ?? "demo", ...p };
}

let restaurantCounter = 0;
export function createRestaurant(
  r: Omit<RestaurantOption, "id" | "favorite" | "visited" | "notes" | "source"> & { source?: RestaurantOption["source"] },
): RestaurantOption {
  restaurantCounter += 1;
  return {
    id: `restaurant-${restaurantCounter}`,
    favorite: false,
    visited: false,
    notes: "",
    source: r.source ?? "demo",
    ...r,
  };
}

let hotelCounter = 0;
export function createHotel(
  h: Omit<HotelOption, "id" | "bookingStatus" | "notes" | "source"> & { source?: HotelOption["source"] },
): HotelOption {
  hotelCounter += 1;
  return {
    id: `hotel-${hotelCounter}`,
    bookingStatus: "not-booked",
    notes: "",
    source: h.source ?? "demo",
    ...h,
  };
}
