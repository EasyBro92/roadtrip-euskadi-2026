import { useRef } from "react";

/** Recorrido horizontal mínimo para que cuente como cambio de día. */
const UMBRAL_CAMBIO_PX = 60;
/** Movimiento a partir del cual se decide si el gesto es horizontal o vertical. */
const UMBRAL_DECISION_PX = 10;

/**
 * Deslizar de lado para pasar de un día al siguiente o al anterior.
 *
 * Ignora los gestos que empiezan sobre algo interactivo —botones, campos, el
 * asa de arrastrar— porque el itinerario reordena paradas con arrastre y no
 * puede pelearse con esto. Y decide dirección antes de moverse, para no
 * cambiar de día mientras haces scroll vertical por la lista.
 */
export function useDaySwipe({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const direccion = useRef<"indecisa" | "horizontal" | "vertical">("indecisa");

  return {
    onPointerDown: (e: React.PointerEvent) => {
      const origen = e.target as HTMLElement;
      if (origen.closest("button, a, input, textarea, select, [data-no-swipe]")) {
        inicio.current = null;
        return;
      }
      inicio.current = { x: e.clientX, y: e.clientY };
      direccion.current = "indecisa";
    },

    onPointerMove: (e: React.PointerEvent) => {
      if (!inicio.current || direccion.current !== "indecisa") return;
      const dx = Math.abs(e.clientX - inicio.current.x);
      const dy = Math.abs(e.clientY - inicio.current.y);
      if (dx < UMBRAL_DECISION_PX && dy < UMBRAL_DECISION_PX) return;
      direccion.current = dx > dy ? "horizontal" : "vertical";
    },

    onPointerUp: (e: React.PointerEvent) => {
      const desde = inicio.current;
      inicio.current = null;
      if (!desde || direccion.current !== "horizontal") return;

      const dx = e.clientX - desde.x;
      if (Math.abs(dx) < UMBRAL_CAMBIO_PX) return;
      // Arrastrar el contenido hacia la izquierda trae el día siguiente,
      // como pasar página.
      if (dx < 0) onNext();
      else onPrev();
    },

    onPointerCancel: () => {
      inicio.current = null;
      direccion.current = "indecisa";
    },
  };
}
