/**
 * Limitador de ritmo para APIs públicas.
 *
 * Overpass y Nominatim son gratuitos y mantenidos por voluntarios: si les
 * lanzas ráfagas te bloquean, y con razón. Cada llamada a la función que
 * devuelve espera lo necesario para no pasar del ritmo acordado.
 */
export function crearLimitador(intervaloMinimoMs: number): () => Promise<void> {
  let ultimaLlamada = 0;
  let cola: Promise<void> = Promise.resolve();

  return () => {
    // Encadenar las esperas evita que diez llamadas simultáneas lean todas el
    // mismo `ultimaLlamada` y salgan a la vez.
    cola = cola.then(async () => {
      const transcurrido = Date.now() - ultimaLlamada;
      if (transcurrido < intervaloMinimoMs) {
        await new Promise((r) => setTimeout(r, intervaloMinimoMs - transcurrido));
      }
      ultimaLlamada = Date.now();
    });
    return cola;
  };
}
