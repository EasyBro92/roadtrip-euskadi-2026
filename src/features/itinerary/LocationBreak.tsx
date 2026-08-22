import { Car } from "lucide-react";
import { formatKm } from "../../utils/format";

/**
 * Separador entre dos paradas que están en sitios distintos, con el salto que
 * hay entre ellas. Visitando varias localidades el mismo día, la lista era una
 * fila detrás de otra y no se veía dónde acababa un sitio y empezaba el
 * siguiente.
 *
 * La distancia es en línea recta, no por carretera: sirve para dar idea del
 * salto, no como estimación de viaje. Por eso dice "aprox.".
 */
export function LocationBreak({ metros }: { metros: number }) {
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden="true">
      <span className="h-px flex-1 bg-(--color-border)" />
      <span className="flex items-center gap-1.5 rounded-full bg-(--color-surface-muted) px-2.5 py-1 text-[11px] font-medium text-(--color-text-muted)">
        <Car size={12} /> {formatKm(metros)} aprox.
      </span>
      <span className="h-px flex-1 bg-(--color-border)" />
    </div>
  );
}
