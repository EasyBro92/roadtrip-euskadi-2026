import { Navigate } from "react-router-dom";
import { useTripStore } from "../stores/useTripStore";

/**
 * Punto de entrada de la app. Con dos niveles (mis viajes → un viaje) la raíz
 * ya no puede ser una pantalla: decide a dónde entras.
 *
 * El ajuste "ir directo al mapa la próxima vez" se respeta aquí. Antes vivía
 * dentro de la portada, que ahora es el Resumen de un viaje concreto: si
 * siguiera allí, entrar a propósito en el Resumen te expulsaría al mapa.
 */
export function EntryRedirect() {
  const irDirectoAlMapa = useTripStore((s) => s.trip.settings.skipWelcomeScreen);
  return <Navigate to={irDirectoAlMapa ? "/mapa" : "/viajes"} replace />;
}
