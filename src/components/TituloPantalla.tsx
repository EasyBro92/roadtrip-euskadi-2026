import { useEffect, useRef, useState, type ReactNode } from "react";

/** A partir de aquí se considera que has empezado a leer, no a asomarte. */
const DESPLAZAMIENTO_MINIMO = 28;

/** El primer ancestro que se desplaza de verdad. */
function scrollerDe(nodo: HTMLElement | null): HTMLElement | null {
  for (let n = nodo?.parentElement ?? null; n; n = n.parentElement) {
    const desborde = getComputedStyle(n).overflowY;
    if (desborde === "auto" || desborde === "scroll") return n;
  }
  return null;
}

/**
 * El título de una pantalla, que se encoge al desplazar.
 *
 * Grande al llegar, porque dice dónde estás; pequeño en cuanto empiezas a
 * leer, porque entonces ya lo sabes y lo que quieres es sitio. Son unos 20 px
 * de alto recuperados justo cuando estás recorriendo una lista, que es la
 * mayor parte del tiempo que se pasa en Gastos o en Más.
 *
 * Busca solo su contenedor desplazable subiendo por los ancestros, para que
 * ponerlo sea sustituir un `<h1>` y nada más. En las pantallas cuyo título
 * vive fuera de la zona que se desplaza —Itinerario y Diario, que tienen la
 * cabecera fija encima de la lista— no encuentra ninguno y se queda grande,
 * que es exactamente lo que debe hacer: ahí no hay hueco que recuperar
 * porque el título no se va nunca.
 */
export function TituloPantalla({ children, className = "" }: { children: ReactNode; className?: string }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const scroller = scrollerDe(titulo.current);
    if (!scroller) return;

    const alDesplazar = () => setCompacto(scroller.scrollTop > DESPLAZAMIENTO_MINIMO);
    alDesplazar();
    scroller.addEventListener("scroll", alDesplazar, { passive: true });
    return () => scroller.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <h1
      ref={titulo}
      className={`font-bold text-(--color-text) transition-[font-size,margin] duration-200 ${compacto ? "text-base" : "text-xl"} ${className}`}
    >
      {children}
    </h1>
  );
}
