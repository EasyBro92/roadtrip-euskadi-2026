import { useRef, useState } from "react";
import { PhotoService } from "../services/photos/PhotoService";
import { useUIStore } from "../stores/useUIStore";

/**
 * ¿Puede el navegador abrir la hoja de compartir del sistema con estos
 * ficheros? Es la única forma que tiene una web de ofrecer "Guardar en
 * Fotos": ni iOS ni Android dejan que una página escriba directamente en la
 * galería, con o sin app instalada — es una barrera de seguridad del propio
 * sistema, no una limitación de esta app.
 */
function puedeCompartir(ficheros: File[]): boolean {
  return typeof navigator.canShare === "function" && navigator.canShare({ files: ficheros });
}

interface Destino {
  stopId: string | null;
  dayId: string | null;
}

/**
 * Añadir fotos desde cualquier pantalla, sin repetir el input de fichero.
 *
 * No lleva `capture`: con `capture` el móvil abre la cámara directamente y te
 * quita la opción de elegir una foto que ya tengas. Sin él, Android e iOS
 * ofrecen las dos cosas — cámara y galería—, que es lo que hace falta.
 *
 * Al tomar una foto por aquí, si vas a través del selector combinado del
 * navegador (no la app Cámara del sistema), muchos móviles NO la guardan
 * en la galería — se queda sólo dentro de Easy Travel. Después de añadirla,
 * si el navegador lo permite, se abre la hoja de compartir del sistema para
 * que la guardes también fuera con un toque más ("Guardar imagen").
 */
export function useAnadirFotos(destino: Destino, alTerminar?: (ids: string[]) => void) {
  const referencia = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  async function alElegir(ficheros: FileList | null) {
    if (!ficheros?.length) return;
    const lista = Array.from(ficheros);
    setSubiendo(true);
    try {
      const ids: string[] = [];
      for (const fichero of lista) {
        const foto = await PhotoService.addUserPhoto(fichero, destino);
        ids.push(foto.id);
      }
      pushToast(ids.length === 1 ? "Foto añadida." : `${ids.length} fotos añadidas.`, "success");
      alTerminar?.(ids);

      /*
       * Ofrecer guardarlas también en el móvil, con el fichero original —no
       * la copia comprimida que se queda dentro de la app—, abriendo la hoja
       * de compartir del sistema, que es donde vive "Guardar imagen" tanto
       * en iOS como en Android. Se intenta aquí mismo, dentro del gesto de
       * elegir el fichero: fuera de un toque del usuario el navegador lo
       * bloquea, así que no se puede aplazar ni convertir en automático.
       */
      if (puedeCompartir(lista)) {
        try {
          await navigator.share({ files: lista });
        } catch (error) {
          // AbortError: has cerrado la hoja sin elegir nada, no es un fallo.
          if ((error as Error).name !== "AbortError") {
            pushToast("La foto ya está en el viaje, pero no se pudo abrir la hoja para guardarla también en el móvil.", "info");
          }
        }
      }
    } catch (error) {
      pushToast(`No se pudo añadir la foto: ${(error as Error).message}`, "error");
    } finally {
      setSubiendo(false);
      // Sin esto, elegir la misma foto dos veces seguidas no dispara el evento.
      if (referencia.current) referencia.current.value = "";
    }
  }

  const input = (
    <input ref={referencia} type="file" accept="image/*" multiple hidden onChange={(e) => alElegir(e.target.files)} />
  );

  return { abrir: () => referencia.current?.click(), input, subiendo };
}
