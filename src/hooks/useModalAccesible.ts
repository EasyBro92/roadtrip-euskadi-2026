import { useEffect, type RefObject } from "react";

/** Lo que un teclado puede alcanzar. */
const FOCOABLES =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function visibles(contenedor: HTMLElement): HTMLElement[] {
  return [...contenedor.querySelectorAll<HTMLElement>(FOCOABLES)].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Lo que hace falta para que un modal se pueda usar sin ratón ni vista.
 *
 * Medido antes de escribir esto, con una ficha de parada abierta: el foco se
 * quedaba en el `<body>` —así que un lector de pantalla no anunciaba nada y
 * con el teclado había que recorrer la página de detrás para llegar a la
 * ficha—, la tecla Escape no hacía nada, y quedaban 38 elementos de detrás
 * todavía alcanzables con el tabulador: se tabulaba "a través" del modal
 * hasta cosas tapadas por él que no se ven.
 *
 * En toda la app no había ni un `role="dialog"`, ni un `aria-modal`, ni una
 * tecla Escape, ni una llamada a `focus()`. Como los diez modales se montan
 * en el mismo sitio, esto se arregla una vez para todos.
 *
 * Hace cuatro cosas:
 *  - lleva el foco dentro al abrir, y lo devuelve a donde estaba al cerrar;
 *  - cierra con Escape;
 *  - encierra el tabulador, que da la vuelta en vez de escaparse detrás;
 *  - anuncia el diálogo con el título que ya tiene dentro.
 */
export function useModalAccesible(contenedor: RefObject<HTMLElement | null>, abierto: boolean, onCerrar: () => void): void {
  useEffect(() => {
    const caja = contenedor.current;
    if (!abierto || !caja) return;

    /*
     * A dónde vuelve el foco al cerrar.
     *
     * Sin esto, cerrar una ficha deja el foco en ninguna parte y el siguiente
     * tabulador empieza otra vez desde arriba de la página — habiendo perdido
     * el sitio de la lista donde estabas.
     */
    const previo = document.activeElement as HTMLElement | null;

    // El título que ya existe dentro sirve de nombre del diálogo.
    const titulo = caja.querySelector("h1, h2");
    if (titulo) {
      if (!titulo.id) titulo.id = `titulo-modal-${Math.random().toString(36).slice(2, 8)}`;
      caja.setAttribute("aria-labelledby", titulo.id);
    }

    const primero = visibles(caja)[0];
    // Al contenedor si no hay nada que enfocar: lo importante es que el foco
    // entre, para que el lector de pantalla lea el diálogo.
    (primero ?? caja).focus({ preventScroll: true });

    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrar();
        return;
      }

      if (e.key !== "Tab" || !caja) return;

      const lista = visibles(caja);
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }

      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement as HTMLElement | null;

      // Fuera del modal (o en el propio contenedor): de vuelta adentro.
      if (!actual || !caja.contains(actual)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primero).focus();
        return;
      }

      if (!e.shiftKey && actual === ultimo) {
        e.preventDefault();
        primero.focus();
      } else if (e.shiftKey && actual === primero) {
        e.preventDefault();
        ultimo.focus();
      }
    }

    document.addEventListener("keydown", alPulsarTecla, true);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla, true);
      // Sólo si el sitio de antes sigue existiendo y en la página.
      if (previo && previo.isConnected) previo.focus({ preventScroll: true });
    };
  }, [contenedor, abierto, onCerrar]);
}
