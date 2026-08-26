import { useRef, useState } from "react";
import { PhotoService } from "../services/photos/PhotoService";
import { useUIStore } from "../stores/useUIStore";

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
 */
export function useAnadirFotos(destino: Destino, alTerminar?: (ids: string[]) => void) {
  const referencia = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  async function alElegir(ficheros: FileList | null) {
    if (!ficheros?.length) return;
    setSubiendo(true);
    try {
      const ids: string[] = [];
      for (const fichero of ficheros) {
        const foto = await PhotoService.addUserPhoto(fichero, destino);
        ids.push(foto.id);
      }
      pushToast(ids.length === 1 ? "Foto añadida." : `${ids.length} fotos añadidas.`, "success");
      alTerminar?.(ids);
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
