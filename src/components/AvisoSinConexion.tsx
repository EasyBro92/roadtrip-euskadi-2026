import { WifiOff } from "lucide-react";
import { useOnline } from "../hooks/useOnline";

/**
 * Franja fina cuando no hay conexión.
 *
 * Sin esto, quedarse sin cobertura se parecía demasiado a que la app fuera
 * mal: buscar no encontraba nada, los horarios no salían y el mapa se quedaba
 * gris, todo sin explicación. Decirlo una vez, arriba, ahorra desconfiar de la
 * app cuando el problema es la carretera.
 *
 * Va por encima de todo (z alto) pero no tapa nada: empuja el contenido.
 */
export function AvisoSinConexion() {
  const enLinea = useOnline();
  if (enLinea) return null;

  return (
    <div
      role="status"
      className="safe-x flex shrink-0 items-center justify-center gap-1.5 bg-(--color-skipped)/20 py-1 text-[11px] font-medium text-(--color-text)"
    >
      <WifiOff size={12} aria-hidden="true" />
      Sin conexión · tu viaje, notas, gastos y fotos siguen funcionando
    </div>
  );
}
