import { Navigate, useLocation } from "react-router-dom";

/**
 * Punto de entrada de la app: siempre el inicio.
 *
 * Antes un ajuste ("ir directo al mapa la próxima vez") podía saltárselo, y
 * quien lo marcaba ya no volvía a ver sus otros viajes ni las ideas de rutas.
 * Ahora el inicio es la portada de la app, como la de Booking, y desde
 * cualquier viaje se vuelve a ella con la barra de arriba.
 */
export function EntryRedirect() {
  // La consulta se conserva: un enlace con ?ejemplo=1 tiene que llegar al inicio con ella.
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/viajes", search }} replace />;
}
