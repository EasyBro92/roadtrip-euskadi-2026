/** Lectura centralizada de variables de entorno (import.meta.env). Ver .env.example. */
export const ENV = {
  GRAPHHOPPER_KEY: import.meta.env.VITE_GRAPHHOPPER_KEY as string | undefined,
  ORS_KEY: import.meta.env.VITE_ORS_KEY as string | undefined,
  MAPTILER_KEY: import.meta.env.VITE_MAPTILER_KEY as string | undefined,
  PLACES_API_KEY: import.meta.env.VITE_PLACES_API_KEY as string | undefined,
  COPILOT_API_URL: import.meta.env.VITE_COPILOT_API_URL as string | undefined,
};

export function hasKey(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
