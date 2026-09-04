export interface FotosDelDia {
  /** La foto de portada de ese día, si tiene una. */
  portada?: string;
  /** El resto de fotos del día, sin la portada. */
  extras: string[];
}

/**
 * Aplana las fotos del álbum en el mismo orden en que se pintan en pantalla:
 * la portada de cada día primero, luego el resto. Es la lista que recorre el
 * visor a pantalla completa al deslizar de una foto a la siguiente — antes
 * no había ningún sitio del álbum donde tocar una foto la ampliara, así que
 * tampoco había cómo pasar de una a otra sin volver a la lista.
 */
export function fotosDelAlbum(dias: FotosDelDia[]): string[] {
  const flat: string[] = [];
  for (const dia of dias) {
    if (dia.portada) flat.push(dia.portada);
    flat.push(...dia.extras);
  }
  return flat;
}
