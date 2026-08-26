import type { Stop, Trip } from "../../types";
import { triggerDownload } from "../../utils/download";
import { db } from "../storage/db";
import { crearZip, type EntradaZip } from "./zip";

/** Nombre apto para cualquier sistema de ficheros, sin acentos ni signos raros. */
function limpiar(texto: string, porDefecto: string): string {
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return limpio || porDefecto;
}

export interface ResumenExportacion {
  fotos: number;
  bytes: number;
}

export const PhotoExportService = {
  /** Cuántas fotos hay y cuánto ocupan, para poder avisar antes de empezar. */
  async resumen(trip: Trip): Promise<ResumenExportacion> {
    const fotos = await fotosDelViaje(trip);
    return { fotos: fotos.length, bytes: fotos.reduce((suma, f) => suma + (f.blob?.size ?? 0), 0) };
  },

  /**
   * Descarga todas las fotos del viaje en un ZIP, con una carpeta por día y
   * el nombre de la parada en cada fichero.
   *
   * Es la vía de escape de las fotos: dentro de la app viven en el
   * almacenamiento del navegador, y si desinstalas la app o el navegador
   * libera espacio, se van. Esto las deja en Descargas, que sí es tuyo.
   */
  async descargarZip(trip: Trip, stopsById: Record<string, Stop>): Promise<ResumenExportacion> {
    const fotos = await fotosDelViaje(trip);
    const posicionDelDia = new Map(trip.days.map((d, i) => [d.id, i + 1]));

    // Un contador por carpeta: numera las fotos en orden dentro de cada día.
    const contador = new Map<string, number>();
    const entradas: EntradaZip[] = [];

    for (const foto of fotos) {
      if (!foto.blob) continue;

      const dia = foto.dayId ? posicionDelDia.get(foto.dayId) : undefined;
      const diaObj = foto.dayId ? trip.days.find((d) => d.id === foto.dayId) : undefined;
      // Sólo se añade la ciudad, nunca el título: los títulos son frases como
      // "Girona → Castillo de Loarre → Huesca" y dan nombres de carpeta absurdos.
      const ciudad = diaObj?.city ? `-${limpiar(diaObj.city, "")}` : "";
      const carpeta = dia ? `dia-${dia}${ciudad}` : "sin-dia";

      const numero = (contador.get(carpeta) ?? 0) + 1;
      contador.set(carpeta, numero);

      const parada = foto.stopId ? stopsById[foto.stopId]?.name : undefined;
      const base = limpiar(parada ?? foto.description ?? "", "foto");

      entradas.push({
        nombre: `${carpeta}/${String(numero).padStart(2, "0")}-${base}.jpg`,
        datos: new Uint8Array(await foto.blob.arrayBuffer()),
        fecha: foto.takenAt ? new Date(foto.takenAt) : undefined,
      });
    }

    const zip = crearZip(entradas);
    triggerDownload(zip, `${limpiar(trip.name, "viaje")}-fotos.zip`);

    return { fotos: entradas.length, bytes: zip.size };
  },
};

/** Fotos de cualquier día del viaje, más las que no cuelgan de ninguno. */
async function fotosDelViaje(trip: Trip) {
  const idsDeDia = new Set(trip.days.map((d) => d.id));
  const todas = await db.photos.toArray();
  return todas
    .filter((f) => (f.dayId ? idsDeDia.has(f.dayId) : true))
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}
