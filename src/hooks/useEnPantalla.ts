import { useEffect, useRef, useState } from "react";

/**
 * Si un elemento ha llegado a estar en pantalla (o cerca).
 *
 * Se queda en `true` una vez visto: sirve para empezar algo caro —pedir una
 * foto— sólo cuando hace falta, no para saber si sigue a la vista.
 */
export function useEnPantalla<T extends Element>(margen = "300px"): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || visto) return;
    // Sin observador (navegadores muy viejos, pruebas) se da por visto.
    if (typeof IntersectionObserver === "undefined") {
      setVisto(true);
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) setVisto(true);
      },
      { rootMargin: margen },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [visto, margen]);

  return [ref, visto];
}
