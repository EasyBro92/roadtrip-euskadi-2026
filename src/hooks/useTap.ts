import { useRef } from "react";

const DEDUPE_MS = 400;

/**
 * Activación robusta para botones sobre el mapa.
 *
 * En Chrome de Android, algunos toques sobre estos controles emiten
 * `pointerdown`/`touchstart` pero **nunca llegan a emitir `click`** (medido
 * en el propio dispositivo: la secuencia se queda en pointerdown y no hay
 * touchend/click). Con `onClick` a secas, el botón parece muerto.
 *
 * Este hook activa la acción con `pointerup` —que sí llega— y deduplica el
 * `click` posterior cuando el navegador sí lo emite, para no ejecutarla dos
 * veces. Se comprueba que el dedo se levante sobre el mismo botón donde se
 * apoyó, para no disparar al arrastrar el mapa.
 */
export function useTap(handler: () => void) {
  const lastFiredAt = useRef(0);
  const downTarget = useRef<EventTarget | null>(null);

  function fire() {
    const now = Date.now();
    if (now - lastFiredAt.current < DEDUPE_MS) return;
    lastFiredAt.current = now;
    handler();
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      downTarget.current = e.currentTarget;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (downTarget.current !== e.currentTarget) return;
      downTarget.current = null;
      fire();
    },
    onClick: () => fire(),
  };
}
