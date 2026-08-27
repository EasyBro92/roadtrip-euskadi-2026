import { useEffect, useState } from "react";

/**
 * Si el móvil cree que hay conexión.
 *
 * Ojo con lo que significa: `false` es fiable — no hay red y ninguna consulta
 * va a salir. `true` no garantiza nada: se puede estar enganchado al wifi de
 * un hotel que no llega a internet, o en una zona con una raya de cobertura
 * que no da para nada. Por eso esto sólo sirve para avisar cuando **no** hay,
 * y cada servicio sigue tratando sus propios errores.
 */
export function useOnline(): boolean {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const conectado = () => setEnLinea(true);
    const desconectado = () => setEnLinea(false);
    window.addEventListener("online", conectado);
    window.addEventListener("offline", desconectado);
    return () => {
      window.removeEventListener("online", conectado);
      window.removeEventListener("offline", desconectado);
    };
  }, []);

  return enLinea;
}
