import type { RouteTemplate } from "../types";

/**
 * Catálogo de rutas prehechas (Explorar).
 *
 * Las coordenadas NO están escritas a mano: se resolvieron contra Nominatim
 * con `scripts/fetch-route-coords.mjs` y se pegaron aquí ya verificadas, igual
 * que se hizo con las fotos de las paradas. Si añades paradas nuevas, pásalas
 * por ese script en lugar de estimarlas.
 */
export const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: "ruta-costa-brava",
    name: "Costa Brava en 4 días",
    region: "Girona, Cataluña",
    summary:
      "De Girona al Cap de Creus bordeando calas, pueblos de pescadores y acantilados. Distancias cortas: se conduce poco y se camina mucho.",
    dayCount: 4,
    stops: [
      {
        name: "Girona",
        category: "ciudad",
        coordinates: { latitude: 41.9793, longitude: 2.8199 },
        shortDescription: "Casco antiguo, murallas y las casas de colores del río Onyar.",
        recommendedDurationMinutes: 150,
        dayIndex: 1,
      },
      {
        name: "Tossa de Mar",
        category: "playa",
        coordinates: { latitude: 41.7198, longitude: 2.9312 },
        shortDescription: "Villa medieval amurallada sobre el mar, con playa a sus pies.",
        recommendedDurationMinutes: 150,
        dayIndex: 2,
      },
      {
        name: "Calella de Palafrugell",
        category: "pueblo",
        coordinates: { latitude: 41.8897, longitude: 3.1806 },
        shortDescription: "Casas blancas y barcas varadas: la postal clásica de la Costa Brava.",
        recommendedDurationMinutes: 120,
        dayIndex: 2,
      },
      {
        name: "Begur",
        category: "pueblo",
        coordinates: { latitude: 41.9542, longitude: 3.2088 },
        shortDescription: "Castillo en lo alto con vistas a las calas y casas indianas en el pueblo.",
        recommendedDurationMinutes: 120,
        dayIndex: 3,
      },
      {
        name: "Cadaqués",
        category: "pueblo",
        coordinates: { latitude: 42.2893, longitude: 3.2752 },
        shortDescription: "Pueblo blanco al final de una carretera de curvas, refugio de Dalí.",
        recommendedDurationMinutes: 180,
        dayIndex: 3,
      },
      {
        name: "Cap de Creus",
        category: "paisaje",
        coordinates: { latitude: 42.3189, longitude: 3.3148 },
        shortDescription: "El punto más oriental de la península: roca esculpida por la tramontana.",
        recommendedDurationMinutes: 150,
        dayIndex: 4,
      },
    ],
  },
  {
    id: "ruta-picos-europa",
    name: "Picos de Europa en 5 días",
    region: "Asturias y Cantabria",
    summary:
      "Covadonga, sus lagos y el teleférico de Fuente Dé, cruzando de Asturias a Cantabria por el desfiladero. Etapas de montaña: conducción lenta.",
    dayCount: 5,
    stops: [
      {
        name: "Cangas de Onís",
        category: "pueblo",
        coordinates: { latitude: 43.3136, longitude: -5.0659 },
        shortDescription: "Puerta del parque nacional, con su puente romano sobre el Sella.",
        recommendedDurationMinutes: 120,
        dayIndex: 1,
      },
      {
        name: "Covadonga",
        category: "historia",
        coordinates: { latitude: 43.3042, longitude: -5.0615 },
        shortDescription: "Basílica y Santa Cueva encajadas en la montaña.",
        recommendedDurationMinutes: 120,
        dayIndex: 2,
      },
      {
        name: "Lagos de Covadonga",
        category: "naturaleza",
        coordinates: { latitude: 43.272, longitude: -4.9916 },
        shortDescription: "Enol y Ercina en alta montaña. En temporada solo se sube en autobús.",
        recommendedDurationMinutes: 180,
        dayIndex: 2,
      },
      {
        name: "Arenas de Cabrales",
        category: "gastronomia",
        coordinates: { latitude: 43.3034, longitude: -4.8147 },
        shortDescription: "El pueblo del queso azul, entre cuevas de maduración y el río Cares.",
        recommendedDurationMinutes: 120,
        dayIndex: 3,
      },
      {
        name: "Potes",
        category: "pueblo",
        coordinates: { latitude: 43.1537, longitude: -4.6234 },
        shortDescription: "Villa de piedra y madera en Liébana, tras el desfiladero de La Hermida.",
        recommendedDurationMinutes: 150,
        dayIndex: 4,
      },
      {
        name: "Fuente Dé",
        category: "mirador",
        coordinates: { latitude: 43.1437, longitude: -4.8115 },
        shortDescription: "Teleférico que sube 750 metros en cuatro minutos hasta el mirador del Cable.",
        recommendedDurationMinutes: 180,
        dayIndex: 5,
      },
    ],
  },
];

export function getRouteTemplate(id: string): RouteTemplate | undefined {
  return ROUTE_TEMPLATES.find((t) => t.id === id);
}
