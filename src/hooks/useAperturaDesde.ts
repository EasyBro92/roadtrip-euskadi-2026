import { useCallback, useEffect, useRef } from "react";

/** El sitio de la pantalla del que sale la ficha: la tarjeta que has tocado. */
export interface Origen {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ENTRADA_MS = 360;
const SALIDA_MS = 250;

/*
 * La curva del iPhone al abrir una app.
 *
 * Arranca rápido y frena largo. Un `ease-out` normal frena demasiado pronto y
 * el final se ve pegajoso; ésta mantiene la sensación de que algo pesa y se
 * posa.
 */
const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)";

/*
 * El redondeo de la tarjeta pequeña y el de la grande: el mismo número.
 *
 * Es lo que hace que se lea como "la misma tarjeta, ahora más grande" — el
 * efecto de Google Wallet o Passbook al tocar una tarjeta de la pila — y no
 * como "una pantalla nueva que se ha tragado la tarjeta". Con dos radios
 * distintos la esquina "salta" justo al terminar de crecer; con el mismo,
 * no hay nada que saltar.
 */
const RADIO_TARJETA = 22;

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Abrir una ficha creciendo desde la tarjeta que se ha tocado, y cerrarla
 * volviendo ahí.
 *
 * Es el efecto de Google Wallet o Passbook al tocar una tarjeta de la pila:
 * crece, pero se queda siendo una tarjeta —flotando sobre lo demás, con sus
 * cuatro esquinas redondeadas—, no una pantalla nueva que se traga la
 * tarjeta entera. Así se sabe de dónde ha salido lo que se ve y dónde
 * volverá al cerrarlo; una hoja que sube desde abajo no dice nada de eso,
 * podría venir de cualquier fila de la lista.
 *
 * El truco es recortar, no estirar. La ficha se dibuja desde el principio a
 * su tamaño final —el que le den sus propias clases, sea del tamaño que
 * sea— y lo que se anima es la ventana por la que se ve, que empieza siendo
 * exactamente el rectángulo de la tarjeta pequeña y se abre hasta ocuparlo
 * todo. Escalando de verdad, el texto y la foto se deforman mientras dura la
 * animación y se nota mucho; así nada se estira, sólo se destapa.
 *
 * El punto de crecimiento se ancla al centro de la tarjeta pequeña, de modo
 * que el movimiento sale de donde estaba el dedo.
 */
export function useAperturaDesde(origen: Origen | undefined, onCerrar: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const cerrando = useRef(false);
  /*
   * La animación en curso, para poder cancelarla.
   *
   * En desarrollo React monta cada efecto dos veces, así que salían dos
   * animaciones sobre el mismo panel peleándose por el mismo `clip-path`.
   * Y aunque eso no pasa en producción, sigue haciendo falta: abrir una ficha
   * justo mientras se cierra otra dejaría dos a la vez.
   */
  const enCurso = useRef<Animation | null>(null);

  /**
   * La ventana inicial y desde dónde crece, en coordenadas del panel.
   *
   * Cancela antes de medir, y no después: mientras hay una animación en curso
   * el panel lleva puesto un `scale(0.94)`, y medirlo así da un rectángulo más
   * pequeño del real. La ventana salía descuadrada unos diez píxeles y la
   * ficha no arrancaba justo encima de su tarjeta.
   */
  const recorte = useCallback(() => {
    const el = panel.current;
    if (!el || !origen) return null;

    enCurso.current?.cancel();
    const p = el.getBoundingClientRect();
    if (p.width === 0 || p.height === 0) return null;

    // Recortes negativos si la tarjeta cae fuera del panel: a cero, o el
    // navegador ignora el `inset` entero y no se anima nada.
    const arriba = Math.max(0, origen.y - p.y);
    const derecha = Math.max(0, p.right - (origen.x + origen.w));
    const abajo = Math.max(0, p.bottom - (origen.y + origen.h));
    const izquierda = Math.max(0, origen.x - p.x);

    return {
      clip: `inset(${arriba}px ${derecha}px ${abajo}px ${izquierda}px round ${RADIO_TARJETA}px)`,
      centro: `${origen.x + origen.w / 2 - p.x}px ${origen.y + origen.h / 2 - p.y}px`,
    };
  }, [origen]);

  useEffect(() => {
    const el = panel.current;
    const velo = fondo.current;
    if (!el || reduceMotion()) return;

    const desde = recorte();
    if (desde) {
      el.style.transformOrigin = desde.centro;
      enCurso.current = el.animate(
        [
          { clipPath: desde.clip, transform: "scale(0.94)", opacity: 0.6 },
          { clipPath: `inset(0px 0px 0px 0px round ${RADIO_TARJETA}px)`, transform: "none", opacity: 1 },
        ],
        { duration: ENTRADA_MS, easing: CURVA },
      );
    }
    velo?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTRADA_MS, easing: CURVA });
  }, [recorte]);

  const cerrar = useCallback(() => {
    // Sin esto, tocar dos veces el fondo lanza dos animaciones y la segunda
    // parte de un panel que ya se está yendo.
    if (cerrando.current) return;
    cerrando.current = true;

    const el = panel.current;
    const velo = fondo.current;
    const hasta = recorte();

    if (!el || !hasta || reduceMotion()) {
      onCerrar();
      return;
    }

    el.style.transformOrigin = hasta.centro;
    velo?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SALIDA_MS, easing: CURVA, fill: "forwards" });

    const vuelta = el.animate(
      [
        { clipPath: `inset(0px 0px 0px 0px round ${RADIO_TARJETA}px)`, transform: "none", opacity: 1 },
        { clipPath: hasta.clip, transform: "scale(0.94)", opacity: 0.6 },
      ],
      { duration: SALIDA_MS, easing: CURVA, fill: "forwards" },
    );

    enCurso.current = vuelta;

    /*
     * Cerrar de verdad aunque la animación no termine nunca.
     *
     * El reloj de las animaciones se para cuando la pestaña deja de pintarse
     * — cambias de app a mitad del gesto —, y entonces `onfinish` no llega y
     * la ficha se queda abierta encima de todo. Probado: en una pestaña de
     * fondo, tocar fuera no la cerraba.
     *
     * Este temporizador va un pelín por detrás de la animación, así que
     * cuando todo va bien no hace nada: `onfinish` ya habrá cerrado. Cerrar
     * dos veces no molesta, sólo vuelve a poner el modal en "ninguno".
     */
    const red = setTimeout(onCerrar, SALIDA_MS + 120);
    vuelta.onfinish = () => {
      clearTimeout(red);
      onCerrar();
    };

    // Si la cancela una ficha nueva que se está abriendo, esta ya no manda:
    // cerrar aquí cerraría la nueva.
    vuelta.oncancel = () => {
      clearTimeout(red);
      if (enCurso.current === vuelta) onCerrar();
    };
  }, [recorte, onCerrar]);

  return { panel, fondo, cerrar };
}
