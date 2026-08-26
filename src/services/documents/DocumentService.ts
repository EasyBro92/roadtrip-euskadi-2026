import type { ID, ISODate } from "../../types";
import { generateId } from "../../utils/id";
import { db } from "../storage/db";

export const TIPOS_DOCUMENTO = ["reserva", "entrada", "billete", "otro"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  reserva: "Reserva",
  entrada: "Entrada",
  billete: "Billete",
  otro: "Otro",
};

export interface Documento {
  id: ID;
  dayId: ID | null;
  titulo: string;
  tipo: TipoDocumento;
  localizador?: string;
  /** Día al que corresponde: entrada al hotel, hora del vuelo… */
  fecha?: ISODate;
  hora?: string;
  nombreFichero?: string;
  mime?: string;
  tamanoBytes?: number;
  createdAt: string;
}

/** Lo mismo, con el fichero. Sólo se saca cuando se va a abrir. */
export interface DocumentoGuardado extends Documento {
  blob?: Blob;
}

/** Un PDF de reserva pesa poco; por encima de esto seguramente sea un error. */
export const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

/**
 * Reservas, entradas y billetes del viaje.
 *
 * Se guardan en IndexedDB con el fichero dentro, no como enlace: la gracia es
 * poder abrir la confirmación del hotel al llegar, que es justo cuando puede
 * que no tengas cobertura.
 */
export const DocumentService = {
  async listar(): Promise<Documento[]> {
    const todos = await db.documents.toArray();
    return todos
      .map(({ blob: _blob, ...resto }) => resto)
      .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") || a.createdAt.localeCompare(b.createdAt));
  },

  async guardar(
    datos: Omit<Documento, "id" | "createdAt" | "nombreFichero" | "mime" | "tamanoBytes">,
    fichero?: File,
  ): Promise<Documento> {
    if (fichero && fichero.size > TAMANO_MAXIMO_BYTES) {
      throw new Error(`El fichero pesa más de ${Math.round(TAMANO_MAXIMO_BYTES / 1024 / 1024)} MB.`);
    }

    const documento: DocumentoGuardado = {
      ...datos,
      id: generateId("doc"),
      createdAt: new Date().toISOString(),
      nombreFichero: fichero?.name,
      mime: fichero?.type,
      tamanoBytes: fichero?.size,
      blob: fichero,
    };

    await db.documents.put(documento);
    const { blob: _blob, ...sinFichero } = documento;
    return sinFichero;
  },

  /** URL temporal para abrir el fichero. Quien la pide debe revocarla. */
  async urlDe(id: ID): Promise<string | null> {
    const guardado = await db.documents.get(id);
    return guardado?.blob ? URL.createObjectURL(guardado.blob) : null;
  },

  async borrar(id: ID): Promise<void> {
    await db.documents.delete(id);
  },
};

/**
 * Documentos cuya hora es hoy o mañana.
 *
 * Es lo único que se puede prometer sin servidor: una PWA cerrada no puede
 * hacer sonar nada, así que el recordatorio salta al abrir la app. Decirlo
 * claro es mejor que un aviso que no llega.
 */
export function proximos(documentos: Documento[], hoy = new Date()): Documento[] {
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const ventana = new Set([dia(hoy), dia(manana)]);
  return documentos.filter((d) => d.fecha && ventana.has(d.fecha));
}
