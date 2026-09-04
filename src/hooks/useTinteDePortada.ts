import { useEffect, useState } from "react";
import { tinteDominante, type Tinte } from "../services/color/tinteDominante";

/** Lado del lienzo al que se reduce la foto antes de mirarla. */
const MUESTRA = 32;

const CLAVE = "easytravel:tinte:";
/** Marca de "esta foto no da color": se guarda igual, para no reintentarlo. */
const SIN_COLOR = "-";

/*
 * Lo ya calculado, en memoria y en disco.
 *
 * Sacar el color obliga a descargar la foto, decodificarla y recorrer mil
 * píxeles. Hacerlo cada vez que se entra en Mis viajes sería pagar eso por un
 * dato que no cambia nunca: la portada de un viaje terminado es la misma hoy
 * que dentro de un año.
 */
const memoria = new Map<string, Tinte | null>();

/** Clave corta y estable para una URL larga de Wikimedia. */
function clave(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h << 5) - h + url.charCodeAt(i);
    h |= 0;
  }
  return CLAVE + (h >>> 0).toString(36);
}

function leerGuardado(url: string): Tinte | null | undefined {
  try {
    const crudo = localStorage.getItem(clave(url));
    if (crudo === null) return undefined;
    if (crudo === SIN_COLOR) return null;
    const [h, s] = crudo.split(",").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(s)) return undefined;
    return { h, s };
  } catch {
    // Ventana privada o almacenamiento bloqueado: se recalcula y ya está.
    return undefined;
  }
}

function guardar(url: string, tinte: Tinte | null): void {
  try {
    localStorage.setItem(clave(url), tinte ? `${tinte.h},${tinte.s}` : SIN_COLOR);
  } catch {
    /* Sin sitio o sin permiso: se queda sólo en memoria. */
  }
}

/**
 * El color de la foto de portada de un viaje.
 *
 * Devuelve `null` mientras no se sabe, y también cuando la foto no tiene
 * color que sacar o no se ha podido leer — quien llame pinta entonces con el
 * azul de la app. Nunca lanza: una portada que no carga no puede romper la
 * lista de viajes.
 *
 * La foto se lee con `crossOrigin`, que es lo que permite mirar sus píxeles;
 * Wikimedia —de donde salen todas las portadas— manda la cabecera que hace
 * falta. Si algún día una portada viniera de un sitio que no la manda, el
 * lienzo queda "manchado", `getImageData` lanza, y aquí se traduce en un
 * viaje azul en vez de en una pantalla rota.
 */
export function useTinteDePortada(url: string | undefined): Tinte | null {
  const [tinte, setTinte] = useState<Tinte | null>(() => {
    if (!url) return null;
    if (memoria.has(url)) return memoria.get(url) ?? null;
    const guardado = leerGuardado(url);
    if (guardado !== undefined) {
      memoria.set(url, guardado);
      return guardado;
    }
    return null;
  });

  useEffect(() => {
    if (!url || memoria.has(url)) return;

    const guardado = leerGuardado(url);
    if (guardado !== undefined) {
      memoria.set(url, guardado);
      setTinte(guardado);
      return;
    }

    let vigente = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    function recordar(resultado: Tinte | null) {
      memoria.set(url!, resultado);
      guardar(url!, resultado);
      if (vigente) setTinte(resultado);
    }

    img.onload = () => {
      try {
        const lienzo = document.createElement("canvas");
        lienzo.width = MUESTRA;
        lienzo.height = MUESTRA;
        const ctx = lienzo.getContext("2d", { willReadFrequently: true });
        if (!ctx) return recordar(null);

        ctx.drawImage(img, 0, 0, MUESTRA, MUESTRA);
        recordar(tinteDominante(ctx.getImageData(0, 0, MUESTRA, MUESTRA).data));
      } catch {
        // Lienzo manchado (sin CORS) o canvas no disponible.
        recordar(null);
      }
    };

    img.onerror = () => recordar(null);
    img.src = url;

    return () => {
      vigente = false;
    };
  }, [url]);

  return tinte;
}
