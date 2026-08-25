import { crearLimitador } from "../../utils/throttle";

/**
 * Turno compartido para todas las llamadas a Nominatim.
 *
 * Su política de uso es de una petición por segundo **por aplicación**, no por
 * servicio. Si cada servicio tuviera su propio limitador, buscar un sitio y
 * abrir una ficha a la vez se saltarían el límite entre los dos sin que
 * ninguno lo notara. Por eso el turno es uno solo y se importa desde aquí.
 */
export const esperarTurnoNominatim = crearLimitador(1100);
