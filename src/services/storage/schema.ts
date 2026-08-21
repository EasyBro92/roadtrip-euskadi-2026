import { z } from "zod";

/**
 * Esquemas de validación para todo lo que entra desde fuera de la app
 * (importar JSON, restaurar snapshot). Nunca se hace `eval`/`Function` ni se
 * confía en el JSON sin pasar por aquí primero (sección 42 y 47).
 */

const coordinatesSchema = z.object({ latitude: z.number(), longitude: z.number() });

const stopCategorySchema = z.enum([
  "naturaleza",
  "fotografia",
  "paisaje",
  "mirador",
  "gastronomia",
  "hotel",
  "estadio",
  "cultura",
  "pueblo",
  "historia",
  "aparcamiento",
  "playa",
  "castillo",
]);

const visitStatusSchema = z.enum(["pending", "completed", "optional", "skipped", "cancelled"]);

export const stopSchema = z
  .object({
    id: z.string().min(1),
    dayId: z.string().min(1),
    order: z.number(),
    name: z.string().min(1),
    shortName: z.string(),
    category: stopCategorySchema,
    coordinates: coordinatesSchema,
    date: z.string(),
    recommendedDurationMinutes: z.number(),
    shortDescription: z.string(),
    fullDescription: z.string(),
    highlights: z.array(z.string()),
    photographyRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    priority: z.enum(["must-see", "high", "medium", "low"]),
    optional: z.boolean(),
    enabled: z.boolean(),
    visited: z.boolean(),
    favorite: z.boolean(),
    visitStatus: visitStatusSchema,
    bookingRequired: z.boolean(),
    googleMapsUrl: z.string(),
    parkingOptions: z.array(z.record(z.string(), z.unknown())),
    restaurantOptions: z.array(z.record(z.string(), z.unknown())),
    hotelOptions: z.array(z.record(z.string(), z.unknown())),
    accessibility: z.record(z.string(), z.unknown()),
    walkingDifficulty: z.enum(["facil", "moderada", "dificil"]),
    tags: z.array(z.string()),
    gallery: z.array(z.string()),
    photos: z.array(z.string()),
    userPhotos: z.array(z.string()),
    notes: z.string(),
    source: z.enum(["real", "demo", "user", "pending-verification"]),
    arrivalRadiusMeters: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const expenseSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    time: z.string(),
    amountEUR: z.number(),
    category: z.enum(["combustible", "hotel", "restaurante", "aparcamiento", "peaje", "entrada", "compra", "otros"]),
    place: z.string(),
    dayId: z.string().nullable(),
    stopId: z.string().nullable(),
    kind: z.enum(["expected", "actual"]),
  })
  .passthrough();

const refuelSchema = z
  .object({
    id: z.string(),
    vehicleId: z.string(),
    date: z.string(),
    place: z.string(),
    odometerKm: z.number(),
    liters: z.number(),
    pricePerLiter: z.number(),
    totalCost: z.number(),
    fullTank: z.boolean(),
  })
  .passthrough();

const tripSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    days: z.array(z.record(z.string(), z.unknown())),
    vehicle: z.record(z.string(), z.unknown()),
    budgetEUR: z.number(),
  })
  .passthrough();

/** Forma completa exportada/importada por SharingService/ExportService. */
export const exportedStateSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  trip: tripSchema,
  stops: z.array(stopSchema),
  expenses: z.array(expenseSchema),
  refuels: z.array(refuelSchema),
  favorites: z.array(z.record(z.string(), z.unknown())),
  notes: z.array(z.record(z.string(), z.unknown())),
  checklist: z.array(z.record(z.string(), z.unknown())),
  achievementsState: z.array(z.record(z.string(), z.unknown())),
  settings: z.record(z.string(), z.unknown()),
});

export type ExportedState = z.infer<typeof exportedStateSchema>;

export function validateExportedState(raw: unknown): { success: true; data: ExportedState } | { success: false; error: string } {
  const result = exportedStateSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
