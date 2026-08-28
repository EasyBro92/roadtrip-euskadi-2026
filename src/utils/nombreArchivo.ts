/**
 * Un nombre de fichero que aguante en cualquier sistema: sin acentos, sin
 * espacios y sin signos raros.
 *
 * Lo usan todas las exportaciones. Antes cada una tenía su copia de esta
 * función, y el JSON se llamaba con el nombre del repositorio y el CSV con el
 * identificador interno del viaje (`gastos-trip-1.csv`), que no le dice nada a
 * nadie al buscarlo en Descargas seis meses después.
 */
export function nombreArchivo(texto: string, porDefecto: string): string {
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    // Los acentos, ya separados de su letra por la normalización.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return limpio || porDefecto;
}
