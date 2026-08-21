/**
 * Abre un enlace externo (Google Maps, normalmente) de forma que también
 * funcione con la app instalada como PWA.
 *
 * Con `display: standalone` el navegador bloquea `window.open(..., "_blank")`
 * y devuelve null, así que al confirmar no ocurría nada. Cuando pasa eso
 * navegamos en la ventana actual: Android entrega igualmente el enlace a la
 * app de Google Maps, y al volver atrás la PWA sigue donde estaba.
 */
export function openExternalUrl(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
}
