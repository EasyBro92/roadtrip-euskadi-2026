/**
 * Reorganización del viaje Euskadi 2026 por ciudades (agosto 2026).
 *
 * Isidro replanteó el viaje: dormir en el valle de Tena el primer día, cruzar
 * Pamplona a mediodía para plantarse en Bilbao, usar Bilbao como base y bajar
 * a Santander y subir a San Sebastián desde allí.
 *
 * Va como migración y no como cambio de los datos semilla **porque él ya tenía
 * el viaje editado en el móvil**: tocar la semilla no llega a un dispositivo
 * con datos guardados, y "Restaurar original" se los habría borrado. La
 * migración reordena lo conocido y deja intacto todo lo demás.
 */

/** Día (empezando en 1) y posición dentro de él, por id de parada. */
export const PLAN_POR_CIUDADES: Record<string, { dia: number; orden: number }> = {
  // Día 1 — salida de Girona, Aragón, noche en el valle de Tena
  "stop-girona": { dia: 1, orden: 0 },
  "stop-castillo-loarre": { dia: 1, orden: 1 },
  "stop-huesca": { dia: 1, orden: 2 },
  "stop-hotel-pedro-i-huesca": { dia: 1, orden: 3 },

  // Día 2 — Pamplona a mediodía, a Bilbao por la tarde
  "stop-el-sadar": { dia: 2, orden: 0 },
  "stop-calle-estafeta": { dia: 2, orden: 1 },
  "stop-pamplona-centro": { dia: 2, orden: 2 },
  "stop-hotel-zaragoza-plaza-ss": { dia: 2, orden: 3 },

  // Día 3 — Bilbao entero
  "stop-guggenheim": { dia: 3, orden: 0 },
  "stop-mercado-ribera": { dia: 3, orden: 1 },
  "stop-casco-viejo-bilbao": { dia: 3, orden: 2 },
  "stop-siete-calles": { dia: 3, orden: 3 },
  "stop-san-mames": { dia: 3, orden: 4 },
  "stop-funicular-artxanda": { dia: 3, orden: 5 },
  "stop-mirador-artxanda": { dia: 3, orden: 6 },
  "stop-hotel-conde-duque-bilbao-d3": { dia: 3, orden: 7 },

  // Día 4 — Santander hasta la tarde y vuelta a dormir a Bilbao
  "stop-santona": { dia: 4, orden: 0 },
  "stop-palacio-magdalena": { dia: 4, orden: 1 },
  "stop-barrio-pesquero": { dia: 4, orden: 2 },
  "stop-el-sardinero": { dia: 4, orden: 3 },
  "stop-santander": { dia: 4, orden: 4 },
  "stop-hotel-conde-duque-bilbao-d4": { dia: 4, orden: 5 },

  // Día 5 — costa de camino y día completo en San Sebastián
  "stop-gaztelugatxe": { dia: 5, orden: 0 },
  "stop-getaria": { dia: 5, orden: 1 },
  "stop-puerto-viejo-getaria": { dia: 5, orden: 2 },
  "stop-getaria-casco": { dia: 5, orden: 3 },
  "stop-flysch-zumaia": { dia: 5, orden: 4 },
  "stop-playa-itzurun": { dia: 5, orden: 5 },
  "stop-reale-arena": { dia: 5, orden: 6 },
  "stop-monte-igueldo": { dia: 5, orden: 7 },
  "stop-playa-concha": { dia: 5, orden: 8 },
  "stop-peine-viento": { dia: 5, orden: 9 },
  "stop-parte-vieja-ss": { dia: 5, orden: 10 },
  "stop-hondarribia": { dia: 5, orden: 11 },
};

/** Título y localidad de cada día, por posición (empezando en 1). */
export const CIUDADES_POR_DIA: Record<number, { title: string; city: string }> = {
  1: { title: "Salida y Aragón", city: "Huesca y valle de Tena" },
  2: { title: "Pamplona y llegada", city: "Pamplona → Bilbao" },
  3: { title: "Día completo", city: "Bilbao" },
  4: { title: "Ida y vuelta", city: "Santander" },
  5: { title: "Costa y despedida", city: "San Sebastián" },
};
