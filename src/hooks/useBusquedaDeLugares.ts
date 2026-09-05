import { useEffect, useRef, useState } from "react";
import { GeocodingService, type GeocodingResult } from "../services/geocoding/GeocodingService";
import { textoRecuadro, type Recuadro } from "../services/geocoding/zonaDelViaje";

/** Lo que se espera a que dejes de escribir antes de preguntar. */
const RETARDO_MS = 400;
/** Con menos letras no se busca: "sa" devuelve medio mundo. */
const MINIMO_LETRAS = 3;

/**
 * Buscar un lugar mientras se escribe, esperando a que pares.
 *
 * Existía dos veces y sólo una estaba bien. El buscador del mapa lo resolvió
 * con un temporizador en un `ref` y dejó escrito el porqué; el editor de
 * paradas usaba un `debounce()` creado **dentro** del componente, y ahí no
 * hay debounce que valga: cada render fabrica una función nueva con su propio
 * temporizador a estrenar, así que ninguna llegaba a cancelar a la anterior y
 * salía una petición por tecla.
 *
 * Y no era sólo ruido. Nominatim está limitado a una petición por segundo
 * para toda la app, así que escribir "San Sebastián" no lanzaba trece
 * búsquedas rápidas: las **encolaba**, y los resultados iban cayendo con
 * segundos de retraso, cada uno pisando al anterior. Escribías la palabra
 * entera y durante diez segundos veías pasar los resultados de "San", "San
 * S", "San Se"… antes de llegar a los buenos.
 *
 * Aquí está una sola vez, con las tres cosas que hacen falta: esperar a que
 * pares de escribir, cancelar la petición que ya no interesa, y descartar la
 * respuesta que llegue tarde aunque no se haya podido cancelar.
 */
export function useBusquedaDeLugares(
  consulta: string,
  opciones?: {
    limite?: number;
    /** Zona del mapa que se prefiere. Los resultados de fuera siguen saliendo. */
    cerca?: Recuadro | null;
    alFallar?: (mensaje: string) => void;
  },
): { resultados: GeocodingResult[]; buscando: boolean } {
  const [resultados, setResultados] = useState<GeocodingResult[]>([]);
  const [buscando, setBuscando] = useState(false);

  const limite = opciones?.limite;
  const cerca = opciones?.cerca ?? null;

  /*
   * El aviso de error, en un `ref`.
   *
   * Es una función nueva en cada render, y puesta entre las dependencias
   * volvería a lanzar la búsqueda continuamente — el mismo tipo de fallo que
   * este hook viene a arreglar, por otra puerta.
   */
  const alFallar = useRef(opciones?.alFallar);
  alFallar.current = opciones?.alFallar;

  /* La zona, como texto: un objeto nuevo en cada render no vale de dependencia. */
  const zona = cerca ? textoRecuadro(cerca) : "";

  useEffect(() => {
    const texto = consulta.trim();

    if (texto.length < MINIMO_LETRAS) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    // Se enseña "buscando" desde ya, aunque la petición todavía no salga: el
    // usuario acaba de escribir y merece saber que se le ha oído.
    setBuscando(true);

    const aborto = new AbortController();
    let vigente = true;

    const temporizador = setTimeout(async () => {
      try {
        const encontrados = await GeocodingService.search(texto, { limit: limite, signal: aborto.signal, cerca });
        if (vigente) setResultados(encontrados);
      } catch (error) {
        // Abortar es lo que queríamos que pasara, no un fallo que contar.
        if (aborto.signal.aborted || !vigente) return;
        setResultados([]);
        alFallar.current?.((error as Error).message);
      } finally {
        if (vigente) setBuscando(false);
      }
    }, RETARDO_MS);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
      aborto.abort();
    };
    // `cerca` va como texto: el objeto cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta, limite, zona]);

  return { resultados, buscando };
}
