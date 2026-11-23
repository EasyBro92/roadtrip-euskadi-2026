import { useRef, useState } from "react";

const ZOOM_DOBLE_TOQUE = 2.5;
const ZOOM_MAX = 4;

interface Vista {
  escala: number;
  x: number;
  y: number;
}

const SIN_ZOOM: Vista = { escala: 1, x: 0, y: 0 };

/**
 * Ampliar una foto como en la galería del móvil: doble toque para acercar
 * donde has tocado (y otra vez para volver), dos dedos para pellizcar y un
 * dedo para moverte mientras está ampliada.
 *
 * Con la foto ampliada, el contenedor lleva `data-no-swipe` para que
 * arrastrar mueva la foto en lugar de pasar a la siguiente.
 */
export function useZoomFoto() {
  const [vista, setVista] = useState<Vista>(SIN_ZOOM);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ distancia: number; escala: number } | null>(null);
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const ultimoToque = useRef(0);
  // Mientras el dedo mueve la foto no hay transición: tiene que seguirlo sin retraso.
  const [moviendo, setMoviendo] = useState(false);

  function alternar(clientX: number, clientY: number, caja: DOMRect) {
    setVista((v) => {
      if (v.escala > 1) return SIN_ZOOM;
      // Acerca hacia el punto tocado: se desplaza la foto lo que ese punto
      // dista del centro, multiplicado por lo que crece.
      const cx = clientX - (caja.left + caja.width / 2);
      const cy = clientY - (caja.top + caja.height / 2);
      return { escala: ZOOM_DOBLE_TOQUE, x: -cx * (ZOOM_DOBLE_TOQUE - 1), y: -cy * (ZOOM_DOBLE_TOQUE - 1) };
    });
  }

  function distanciaEntreDedos(): number {
    const [a, b] = [...punteros.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  const ampliada = vista.escala > 1;

  return {
    ampliada,
    reiniciar: () => setVista(SIN_ZOOM),
    contenedor: {
      "data-no-swipe": ampliada ? "" : undefined,
      style: { touchAction: "none" } as React.CSSProperties,
      onDoubleClick: (e: React.MouseEvent<HTMLElement>) => alternar(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()),
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (punteros.current.size === 2) {
          pellizco.current = { distancia: distanciaEntreDedos(), escala: vista.escala };
          arrastre.current = null;
          setMoviendo(true);
          return;
        }
        // Doble toque con el dedo: el navegador no siempre manda dblclick en táctil.
        const ahora = Date.now();
        if (e.pointerType === "touch" && ahora - ultimoToque.current < 300) {
          alternar(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
          ultimoToque.current = 0;
          return;
        }
        ultimoToque.current = ahora;
        if (ampliada) {
          arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y };
          setMoviendo(true);
        }
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!punteros.current.has(e.pointerId)) return;
        punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pellizco.current && punteros.current.size === 2) {
          const inicio = pellizco.current;
          const escala = Math.min(ZOOM_MAX, Math.max(1, (inicio.escala * distanciaEntreDedos()) / inicio.distancia));
          setVista((v) => (escala === 1 ? SIN_ZOOM : { ...v, escala }));
          return;
        }
        const a = arrastre.current;
        if (a) setVista((v) => ({ ...v, x: a.vx + e.clientX - a.x, y: a.vy + e.clientY - a.y }));
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        punteros.current.delete(e.pointerId);
        if (punteros.current.size < 2) pellizco.current = null;
        if (punteros.current.size === 0) {
          arrastre.current = null;
          setMoviendo(false);
        }
      },
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
        punteros.current.delete(e.pointerId);
        pellizco.current = null;
        arrastre.current = null;
        setMoviendo(false);
      },
    },
    estiloImagen: {
      transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})`,
      transition: moviendo ? "none" : "transform 0.2s ease-out",
      cursor: ampliada ? "grab" : "zoom-in",
    } as React.CSSProperties,
  };
}
