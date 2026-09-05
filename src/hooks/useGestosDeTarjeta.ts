import { useRef, type RefObject } from "react";

/** Lo que hay que bajar para que al soltar se cierre. */
const UMBRAL_CIERRE = 110;
/** Un golpe rápido cierra aunque no se haya bajado tanto (px por ms). */
const VELOCIDAD_CIERRE = 0.5;
/*
 * ...pero por rápido que sea, tiene que haber recorrido esto.
 *
 * Sin este mínimo, un toque con un temblor de diez píxeles sale a una
 * velocidad enorme —diez píxeles en quince milisegundos— y cierra la ficha
 * que acababas de abrir. La velocidad sirve para reconocer un gesto de
 * descarte corto y decidido; no para convertir un pulso en uno.
 */
const MINIMO_GOLPE = 40;
/** Movimiento mínimo antes de decidir si el gesto es hacia abajo o de lado. */
const UMBRAL_GESTO = 6;
/** Por debajo de esto no ha sido un arrastre, ha sido un toque. */
const TOQUE_MAXIMO = 8;
/** Lo que hay que barrer de lado para que la tarjeta se dé la vuelta. */
const UMBRAL_GIRO = 45;

const VUELTA_MS = 260;
const CAIDA_MS = 220;
const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Cuánto se oscurece el fondo, en función de lo bajada que está la tarjeta.
 *
 * No baja a cero: si el velo se fuera del todo a mitad del gesto, soltando a
 * medias verías la app entera a plena luz un instante antes de que la tarjeta
 * vuelva a su sitio, y parecería un parpadeo.
 */
export function opacidadDelVelo(dy: number): number {
  return Math.max(0.45, 1 - dy / 520);
}

/**
 * Al soltar: ¿se va, o vuelve a su sitio?
 *
 * Se va por distancia (la has bajado lo bastante) o por golpe seco (poca
 * distancia pero rápida y decidida). El golpe seco exige además un recorrido
 * mínimo, y esa es la parte que importa: sin él, un toque con un temblor de
 * diez píxeles sale a una velocidad enorme —diez píxeles en quince
 * milisegundos— y cerraba la ficha que acababas de abrir.
 */
export function debeCerrarse(dy: number, ms: number): boolean {
  if (dy > UMBRAL_CIERRE) return true;
  const velocidad = dy / Math.max(1, ms);
  return velocidad > VELOCIDAD_CIERRE && dy > MINIMO_GOLPE;
}

/**
 * Los tres gestos de la tarjeta: bajarla para cerrarla, tocarla o barrerla de
 * lado para darle la vuelta.
 *
 * Bajarla es como se descartan las tarjetas en Google Wallet: el dedo la
 * acompaña, y si sueltas a media altura vuelve a su sitio en vez de irse.
 * Soltar a medias y que la tarjeta decida quedarse es lo que hace que el
 * gesto se pueda probar sin miedo.
 *
 * Tocarla o barrerla de lado la gira. Es lo que se intenta hacer con una
 * tarjeta que tiene dorso, y hacía falta decirlo: con el giro sólo en el
 * botón de la ⓘ, quien tocaba la tarjeta esperando que girase se encontraba
 * con que no pasaba nada. El botón sigue estando, porque un gesto que hay que
 * adivinar no lo encuentra todo el mundo, pero ya no es el único camino.
 *
 * Los gestos viven en la cabecera —la foto, o la barra del dorso—, no en todo
 * el panel. Debajo hay una zona que se desplaza sola, y un arrastre que
 * empiece ahí tiene que mover el contenido, no llevarse la tarjeta: es el
 * mismo movimiento del dedo queriendo decir dos cosas. La cabecera no se
 * desplaza, así que ahí no hay ambigüedad que resolver.
 *
 * Irse arrastrada y cerrarse con el botón no se animan igual a propósito. Con
 * el botón la tarjeta se encoge hasta volver a la fila de la que salió, que
 * es de donde vino; arrastrada, sigue hacia abajo y desaparece por donde la
 * estabas empujando. Cada salida termina donde el gesto apuntaba.
 */
export function useGestosDeTarjeta(
  panel: RefObject<HTMLDivElement | null>,
  fondo: RefObject<HTMLDivElement | null>,
  onCerrado: () => void,
  onGirar: () => void,
  opciones?: {
    /**
     * Sólo el barrido de lado para girar: ni bajar para cerrar, ni tocar.
     *
     * Es lo que se pone en la zona de texto. Ahí el arrastre vertical ya
     * significa "desplaza el contenido", así que no puede significar además
     * "cierra la ficha"; y el toque tiene que quedar libre para leer y pulsar
     * sin que la tarjeta se dé la vuelta sola a media lectura.
     */
    soloGiro?: boolean;
  },
) {
  const soloGiro = opciones?.soloGiro ?? false;
  const gesto = useRef<{ x0: number; y0: number; t0: number; eje: "indeciso" | "vertical" | "otro"; dy: number } | null>(null);
  const yendose = useRef(false);

  function pintar(dy: number) {
    if (panel.current) panel.current.style.transform = dy === 0 ? "" : `translateY(${dy}px)`;
    if (fondo.current) fondo.current.style.opacity = dy === 0 ? "" : String(opacidadDelVelo(dy));
  }

  function volverASuSitio(dy: number) {
    const el = panel.current;
    const velo = fondo.current;
    if (el && dy > 0) {
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: VUELTA_MS, easing: CURVA });
      velo?.animate([{ opacity: opacidadDelVelo(dy) }, { opacity: 1 }], { duration: VUELTA_MS, easing: CURVA });
    }
    pintar(0);
  }

  function irse(dy: number) {
    yendose.current = true;
    const el = panel.current;
    const velo = fondo.current;

    if (!el) return onCerrado();

    const caida = el.animate(
      [
        { transform: `translateY(${dy}px)`, opacity: 1 },
        { transform: `translateY(${window.innerHeight}px)`, opacity: 0.4 },
      ],
      { duration: CAIDA_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    velo?.animate([{ opacity: opacidadDelVelo(dy) }, { opacity: 0 }], { duration: CAIDA_MS, easing: CURVA, fill: "forwards" });

    /*
     * La misma red que en la apertura: el reloj de las animaciones se para
     * cuando la pestaña deja de pintarse, y sin esto la ficha se quedaría
     * abierta si cambias de app justo al soltar.
     */
    const red = setTimeout(onCerrado, CAIDA_MS + 120);
    caida.onfinish = () => {
      clearTimeout(red);
      onCerrado();
    };
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (yendose.current) return;
      /*
       * Un gesto que empieza sobre un botón es de ese botón.
       *
       * En la cabecera viven la X de cerrar y, en el dorso, la flecha de
       * volver. Sin esto, tocar la X contaba además como "toque en la
       * cabecera" y giraba la tarjeta justo mientras se cerraba.
       */
      if ((e.target as HTMLElement).closest("button, a")) {
        gesto.current = null;
        return;
      }
      gesto.current = { x0: e.clientX, y0: e.clientY, t0: e.timeStamp, eje: "indeciso", dy: 0 };
    },

    onPointerMove: (e: React.PointerEvent) => {
      const g = gesto.current;
      if (!g || yendose.current) return;

      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;

      if (g.eje === "indeciso") {
        if (Math.abs(dx) < UMBRAL_GESTO && Math.abs(dy) < UMBRAL_GESTO) return;
        // Sólo hacia abajo: hacia arriba no hay nada a lo que ir. Y en la zona
        // de texto, nunca: ahí bajar es desplazar lo que estás leyendo.
        g.eje = !soloGiro && dy > 0 && dy > Math.abs(dx) ? "vertical" : "otro";
        if (g.eje === "vertical") e.currentTarget.setPointerCapture(e.pointerId);
      }

      if (g.eje !== "vertical") return;
      g.dy = Math.max(0, dy);
      pintar(g.dy);
    },

    onPointerUp: (e: React.PointerEvent) => {
      const g = gesto.current;
      gesto.current = null;
      if (!g || yendose.current) return;

      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;

      if (g.eje === "vertical") {
        if (debeCerrarse(g.dy, e.timeStamp - g.t0)) irse(g.dy);
        else volverASuSitio(g.dy);
        return;
      }

      // Un toque: ni ha bajado ni se ha ido de lado. En la zona de texto no
      // cuenta: leyendo se toca la tarjeta constantemente.
      if (!soloGiro && Math.abs(dx) < TOQUE_MAXIMO && Math.abs(dy) < TOQUE_MAXIMO) return onGirar();

      // Un barrido de lado, en cualquiera de los dos sentidos.
      if (Math.abs(dx) > UMBRAL_GIRO && Math.abs(dx) > Math.abs(dy)) onGirar();
    },

    onPointerCancel: () => {
      const g = gesto.current;
      gesto.current = null;
      if (g && g.eje === "vertical" && !yendose.current) volverASuSitio(g.dy);
    },
  };
}
