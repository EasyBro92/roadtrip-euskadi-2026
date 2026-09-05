/**
 * Esquemas que se pueden abrir.
 *
 * `blob:` está porque los apuntes adjuntos se abren con una URL de objeto
 * creada por la propia app; los demás son enlaces normales.
 */
const ESQUEMAS_PERMITIDOS = new Set(["http:", "https:", "mailto:", "tel:", "blob:"]);

/**
 * ¿Es esta URL de un tipo que se pueda abrir sin peligro?
 *
 * Lo que se descarta es `javascript:` —y cualquier otra cosa rara— porque
 * abrirla no navega a ningún sitio: ejecuta código dentro de la app, con
 * acceso a todo lo que la app guarda.
 */
export function esUrlSegura(url: string): boolean {
  try {
    /*
     * Sin URL base a propósito: así una cadena relativa no cuela.
     *
     * Resolviéndola contra la página, `""` y `"no es una url"` se convertían
     * en la propia dirección de la app —esquema `http:`, permitido— y
     * abrirlas recargaba la app en vez de no hacer nada. Un enlace externo
     * es absoluto por definición.
     */
    return ESQUEMAS_PERMITIDOS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Abre un enlace externo (Google Maps, normalmente) de forma que también
 * funcione con la app instalada como PWA.
 *
 * Con `display: standalone` el navegador bloquea `window.open(..., "_blank")`
 * y devuelve null, así que al confirmar no ocurría nada. Cuando pasa eso
 * navegamos en la ventana actual: Android entrega igualmente el enlace a la
 * app de Google Maps, y al volver atrás la PWA sigue donde estaba.
 *
 * **Se comprueba el esquema antes de abrir.** No todas las URL que llegan
 * aquí las ha escrito el usuario: `stop.officialUrl` entra desde un archivo
 * de viaje importado —y el esquema de importación usa `.passthrough()`, así
 * que un campo que no declara pasa igualmente—, y la web de un sitio cercano
 * sale de la etiqueta `website` de OpenStreetMap, que puede editar
 * cualquiera.
 *
 * Con una `javascript:` ahí, esta función la ejecutaba. Comprobado en el
 * navegador antes de arreglarlo: pulsando "Web oficial" en una parada con
 * `officialUrl: "javascript:…"`, el código corría dentro de la app. React
 * protege los `href` —los sustituye por un error suyo— pero no protege ni
 * `window.open` ni `location.href`, que es por donde pasa esto.
 *
 * Una URL rechazada no hace nada. Es lo correcto: las únicas que caen aquí
 * son las que no eran un enlace.
 */
export function openExternalUrl(url: string): void {
  if (!esUrlSegura(url)) return;

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
}
