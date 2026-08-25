import { useEffect, useState } from "react";
import { PlaceDetailsService, type PlaceDetails } from "../services/places/PlaceDetailsService";
import type { Coordinates } from "../types";

interface EstadoDetalles {
  datos?: PlaceDetails;
  cargando: boolean;
  error?: string;
}

/**
 * Datos prácticos del sitio (horario, teléfono, web) desde OpenStreetMap.
 *
 * La caché se lee siempre; la consulta a la red sólo se lanza con `consultar`
 * en true. Es deliberado: Overpass lo mantienen voluntarios y ya me bloqueó
 * una vez por lanzarle ráfagas. Así, pasar el dedo por diez paradas no dispara
 * diez consultas — sólo abrir la pestaña donde esos datos se van a leer.
 */
export function usePlaceDetails(coordinates: Coordinates, nombre: string, consultar: boolean): EstadoDetalles {
  const [estado, setEstado] = useState<EstadoDetalles>({ cargando: false });

  const { latitude, longitude } = coordinates;

  useEffect(() => {
    let vigente = true;
    const punto = { latitude, longitude };

    (async () => {
      const guardado = await PlaceDetailsService.enCache(punto, nombre);
      if (!vigente) return;
      if (guardado) {
        setEstado({ datos: guardado, cargando: false });
        return;
      }
      if (!consultar) {
        setEstado({ cargando: false });
        return;
      }

      setEstado({ cargando: true });
      try {
        const datos = await PlaceDetailsService.obtener(punto, nombre);
        if (vigente) setEstado({ datos, cargando: false });
      } catch {
        // Overpass caído o sin conexión: lo decimos, no inventamos datos.
        if (vigente) setEstado({ cargando: false, error: "No se ha podido consultar OpenStreetMap." });
      }
    })();

    return () => {
      vigente = false;
    };
  }, [latitude, longitude, nombre, consultar]);

  return estado;
}
