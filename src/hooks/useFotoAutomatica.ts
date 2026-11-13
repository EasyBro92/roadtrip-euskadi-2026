import { useEffect, useState } from "react";
import { FotoAutomaticaService, claveDe, type LugarConFoto } from "../services/photos/FotoAutomaticaService";

/**
 * La foto de un sitio que no trae ninguna. Ver `FotoAutomaticaService`.
 *
 * `activo` deja decidir cuándo preguntar: una lista larga sólo lo activa para
 * las tarjetas que están en pantalla. Lo que ya se encontró otra vez sale al
 * instante, sin esperar a ningún efecto.
 */
export function useFotoAutomatica(lugar: LugarConFoto | undefined, activo = true): string | undefined {
  const clave = lugar ? claveDe(lugar) : "";
  const [encontrada, setEncontrada] = useState<{ clave: string; url: string } | null>(null);

  const sabida = lugar ? FotoAutomaticaService.conocida(lugar) : null;

  useEffect(() => {
    if (!lugar || !activo || sabida !== undefined) return;
    let vigente = true;
    void FotoAutomaticaService.buscar(lugar).then((url) => {
      if (vigente && url) setEncontrada({ clave, url });
    });
    return () => {
      vigente = false;
    };
    // `lugar` es un objeto nuevo en cada pintado; su identidad es la clave.
  }, [clave, activo, sabida]);

  if (sabida) return sabida;
  return encontrada?.clave === clave ? encontrada.url : undefined;
}
