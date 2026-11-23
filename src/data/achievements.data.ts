import type { AchievementDefinition, AchievementEvalContext, Stop, StopCategory } from "../types";

/** El viaje tiene al menos una de estas paradas: el logro va con él. */
function tieneAlguna(ids: string[]) {
  return (stops: Stop[]) => stops.some((s) => ids.includes(s.id));
}

function visitadasDe(ctx: AchievementEvalContext, categorias: StopCategory[]): number {
  return ctx.stops.filter((s) => s.visited && categorias.includes(s.category)).length;
}

/** Hay algún día con paradas y todas las que cuentan, visitadas. */
function diasRedondos(ctx: AchievementEvalContext): number {
  const porId = new Map(ctx.stops.map((s) => [s.id, s]));
  return ctx.trip.days.filter((d) => {
    const paradas = d.stopIds.map((id) => porId.get(id)).filter((s): s is Stop => Boolean(s?.enabled && !s.optional));
    return paradas.length > 0 && paradas.every((s) => s.visited);
  }).length;
}

const COMIDA: StopCategory[] = ["gastronomia"];
const CULTURA: StopCategory[] = ["cultura", "historia", "castillo"];
const NATURALEZA: StopCategory[] = ["naturaleza", "paisaje", "mirador", "playa"];

function stopVisited(ctx: AchievementEvalContext, stopId: string): boolean {
  return ctx.stops.some((s) => s.id === stopId && s.visited);
}

function visitedCount(ctx: AchievementEvalContext): number {
  return ctx.stops.filter((s) => s.visited).length;
}

const COASTAL_BASQUE_STOP_IDS = [
  "stop-hondarribia",
  "stop-monte-igueldo",
  "stop-playa-concha",
  "stop-peine-viento",
  "stop-getaria",
  "stop-puerto-viejo-getaria",
  "stop-playa-itzurun",
  "stop-flysch-zumaia",
  "stop-gaztelugatxe",
];

const BILBAO_STOP_IDS = [
  "stop-guggenheim",
  "stop-mercado-ribera",
  "stop-casco-viejo-bilbao",
  "stop-siete-calles",
  "stop-san-mames",
  "stop-funicular-artxanda",
  "stop-mirador-artxanda",
];

const STADIUM_STOP_IDS = ["stop-el-sadar", "stop-reale-arena", "stop-san-mames", "stop-el-sardinero"];

const HOTEL_STOP_IDS = [
  "stop-hotel-pedro-i-huesca",
  "stop-hotel-zaragoza-plaza-ss",
  "stop-hotel-conde-duque-bilbao-d3",
  "stop-hotel-conde-duque-bilbao-d4",
];

export const ACHIEVEMENT_DEFS: AchievementDefinition[] = [
  {
    id: "ach-first-stop",
    category: "viaje",
    name: "Primera parada",
    description: "Marca tu primera parada como visitada.",
    icon: "MapPin",
    targetValue: 1,
    getProgress: (ctx) => Math.min(1, visitedCount(ctx)),
    isUnlocked: (ctx) => visitedCount(ctx) >= 1,
  },
  {
    id: "ach-first-stadium",
    category: "estadios",
    name: "Primer estadio",
    description: "Visita tu primer estadio de fútbol del viaje.",
    icon: "Trophy",
    targetValue: 1,
    getProgress: (ctx) => Math.min(1, ctx.totalDistinctStadiumsVisited),
    isUnlocked: (ctx) => ctx.totalDistinctStadiumsVisited >= 1,
    aplica: (stops) => stops.some((s) => s.category === "estadio"),
  },
  {
    id: "ach-all-stadiums",
    category: "estadios",
    name: "Todos los estadios",
    description: "Visita El Sadar, Reale Arena, San Mamés y El Sardinero.",
    icon: "Trophy",
    targetValue: STADIUM_STOP_IDS.length,
    getProgress: (ctx) => STADIUM_STOP_IDS.filter((id) => stopVisited(ctx, id)).length,
    isUnlocked: (ctx) => STADIUM_STOP_IDS.every((id) => stopVisited(ctx, id)),
    aplica: tieneAlguna(STADIUM_STOP_IDS),
  },
  {
    id: "ach-first-hotel",
    category: "hoteles",
    name: "Primera noche",
    description: "Llega a tu primer alojamiento del viaje.",
    icon: "BedDouble",
    targetValue: 1,
    // Cualquier alojamiento visitado, no sólo los cuatro del viaje de Euskadi.
    getProgress: (ctx) => Math.min(1, HOTEL_STOP_IDS.filter((id) => stopVisited(ctx, id)).length + visitadasDe(ctx, ["hotel"])),
    isUnlocked: (ctx) => HOTEL_STOP_IDS.some((id) => stopVisited(ctx, id)) || visitadasDe(ctx, ["hotel"]) > 0,
  },
  {
    id: "ach-first-refuel",
    category: "vehiculo",
    name: "Primer repostaje",
    description: "Registra tu primer repostaje.",
    icon: "Fuel",
    targetValue: 1,
    getProgress: (ctx) => Math.min(1, ctx.totalRefuels),
    isUnlocked: (ctx) => ctx.totalRefuels >= 1,
  },
  {
    id: "ach-first-pintxo",
    category: "gastronomia",
    name: "Primer pintxo",
    description: "Visita la Parte Vieja de San Sebastián.",
    icon: "UtensilsCrossed",
    targetValue: 1,
    getProgress: (ctx) => (stopVisited(ctx, "stop-parte-vieja-ss") ? 1 : 0),
    isUnlocked: (ctx) => stopVisited(ctx, "stop-parte-vieja-ss"),
    aplica: tieneAlguna(["stop-parte-vieja-ss"]),
  },
  {
    id: "ach-rodaballo-getaria",
    category: "gastronomia",
    name: "Rodaballo en Getaria",
    description: "Visita Getaria, cuna del rodaballo a la brasa.",
    icon: "Fish",
    targetValue: 1,
    getProgress: (ctx) => (stopVisited(ctx, "stop-getaria") ? 1 : 0),
    isUnlocked: (ctx) => stopVisited(ctx, "stop-getaria"),
    aplica: tieneAlguna(["stop-getaria"]),
  },
  {
    id: "ach-anchoas-santona",
    category: "gastronomia",
    name: "Anchoas de Santoña",
    description: "Visita Santoña, la capital de la anchoa.",
    icon: "Fish",
    targetValue: 1,
    getProgress: (ctx) => (stopVisited(ctx, "stop-santona") ? 1 : 0),
    isUnlocked: (ctx) => stopVisited(ctx, "stop-santona"),
    aplica: tieneAlguna(["stop-santona"]),
  },
  {
    id: "ach-rabas-santander",
    category: "gastronomia",
    name: "Rabas de Santander",
    description: "Visita el Barrio Pesquero de Santander.",
    icon: "Fish",
    targetValue: 1,
    getProgress: (ctx) => (stopVisited(ctx, "stop-barrio-pesquero") ? 1 : 0),
    isUnlocked: (ctx) => stopVisited(ctx, "stop-barrio-pesquero"),
    aplica: tieneAlguna(["stop-barrio-pesquero"]),
  },
  {
    id: "ach-photos-10",
    category: "fotografia",
    name: "10 fotografías",
    description: "Sube 10 fotos propias al álbum del viaje.",
    icon: "Camera",
    targetValue: 10,
    getProgress: (ctx) => Math.min(10, ctx.totalPhotos),
    isUnlocked: (ctx) => ctx.totalPhotos >= 10,
  },
  {
    id: "ach-photos-50",
    category: "fotografia",
    name: "50 fotografías",
    description: "Sube 50 fotos propias al álbum del viaje.",
    icon: "Camera",
    targetValue: 50,
    getProgress: (ctx) => Math.min(50, ctx.totalPhotos),
    isUnlocked: (ctx) => ctx.totalPhotos >= 50,
  },
  {
    id: "ach-photos-100",
    category: "fotografia",
    name: "100 fotografías",
    description: "Sube 100 fotos propias al álbum del viaje.",
    icon: "Camera",
    targetValue: 100,
    getProgress: (ctx) => Math.min(100, ctx.totalPhotos),
    isUnlocked: (ctx) => ctx.totalPhotos >= 100,
  },
  {
    id: "ach-500km",
    category: "kilometros",
    name: "500 km",
    description: "Recorre 500 km en coche.",
    icon: "Gauge",
    targetValue: 500,
    getProgress: (ctx) => Math.min(500, ctx.totalKm),
    isUnlocked: (ctx) => ctx.totalKm >= 500,
  },
  {
    id: "ach-1000km",
    category: "kilometros",
    name: "1.000 km",
    description: "Recorre 1.000 km en coche.",
    icon: "Gauge",
    targetValue: 1000,
    getProgress: (ctx) => Math.min(1000, ctx.totalKm),
    isUnlocked: (ctx) => ctx.totalKm >= 1000,
  },
  {
    id: "ach-costa-vasca",
    category: "pais-vasco",
    name: "Costa vasca completada",
    description: "Visita las 9 paradas costeras del País Vasco del itinerario.",
    icon: "Waves",
    targetValue: COASTAL_BASQUE_STOP_IDS.length,
    getProgress: (ctx) => COASTAL_BASQUE_STOP_IDS.filter((id) => stopVisited(ctx, id)).length,
    isUnlocked: (ctx) => COASTAL_BASQUE_STOP_IDS.every((id) => stopVisited(ctx, id)),
    aplica: tieneAlguna(COASTAL_BASQUE_STOP_IDS),
  },
  {
    id: "ach-bilbao-completo",
    category: "pais-vasco",
    name: "Bilbao completado",
    description: "Visita las 7 paradas del día de Bilbao.",
    icon: "Landmark",
    targetValue: BILBAO_STOP_IDS.length,
    getProgress: (ctx) => BILBAO_STOP_IDS.filter((id) => stopVisited(ctx, id)).length,
    isUnlocked: (ctx) => BILBAO_STOP_IDS.every((id) => stopVisited(ctx, id)),
    aplica: tieneAlguna(BILBAO_STOP_IDS),
  },
  {
    id: "ach-cantabria",
    category: "cantabria",
    name: "Cantabria explorada",
    description: "Visita las paradas del día 5 en Cantabria.",
    icon: "Mountain",
    targetValue: 4,
    getProgress: (ctx) =>
      ["stop-santona", "stop-palacio-magdalena", "stop-barrio-pesquero", "stop-santander"].filter((id) => stopVisited(ctx, id)).length,
    isUnlocked: (ctx) =>
      ["stop-santona", "stop-palacio-magdalena", "stop-barrio-pesquero", "stop-santander"].every((id) => stopVisited(ctx, id)),
    aplica: tieneAlguna(["stop-santona", "stop-palacio-magdalena", "stop-barrio-pesquero", "stop-santander"]),
  },
  {
    id: "ach-dia-redondo",
    category: "viaje",
    name: "Día redondo",
    description: "Visita todas las paradas de un día.",
    icon: "CalendarCheck",
    targetValue: 1,
    getProgress: (ctx) => Math.min(1, diasRedondos(ctx)),
    isUnlocked: (ctx) => diasRedondos(ctx) >= 1,
  },
  {
    id: "ach-tres-dias-redondos",
    category: "viaje",
    name: "Tres días redondos",
    description: "Completa todas las paradas de tres días distintos.",
    icon: "CalendarCheck",
    targetValue: 3,
    getProgress: (ctx) => Math.min(3, diasRedondos(ctx)),
    isUnlocked: (ctx) => diasRedondos(ctx) >= 3,
    aplica: (stops) => new Set(stops.map((s) => s.dayId)).size >= 3,
  },
  {
    id: "ach-buen-comer",
    category: "gastronomia",
    name: "Buen comer",
    description: "Visita 5 sitios de comer del viaje.",
    icon: "UtensilsCrossed",
    targetValue: 5,
    getProgress: (ctx) => Math.min(5, visitadasDe(ctx, COMIDA)),
    isUnlocked: (ctx) => visitadasDe(ctx, COMIDA) >= 5,
    aplica: (stops) => stops.filter((s) => COMIDA.includes(s.category)).length >= 5,
  },
  {
    id: "ach-cultureta",
    category: "viaje",
    name: "Cultureta",
    description: "Visita 5 museos, castillos o monumentos.",
    icon: "Landmark",
    targetValue: 5,
    getProgress: (ctx) => Math.min(5, visitadasDe(ctx, CULTURA)),
    isUnlocked: (ctx) => visitadasDe(ctx, CULTURA) >= 5,
    aplica: (stops) => stops.filter((s) => CULTURA.includes(s.category)).length >= 5,
  },
  {
    id: "ach-aire-libre",
    category: "viaje",
    name: "Aire libre",
    description: "Visita 5 playas, miradores o parajes naturales.",
    icon: "Mountain",
    targetValue: 5,
    getProgress: (ctx) => Math.min(5, visitadasDe(ctx, NATURALEZA)),
    isUnlocked: (ctx) => visitadasDe(ctx, NATURALEZA) >= 5,
    aplica: (stops) => stops.filter((s) => NATURALEZA.includes(s.category)).length >= 5,
  },
  {
    id: "ach-trip-completed",
    category: "viaje",
    name: "Viaje completado",
    description: "Marca todas las paradas del itinerario como visitadas.",
    icon: "PartyPopper",
    getProgress: (ctx) => visitedCount(ctx),
    isUnlocked: (ctx) => ctx.stops.length > 0 && ctx.stops.every((s) => s.visited || s.optional),
  },
];

/** Los logros que tienen sentido en el viaje con estas paradas. */
export function logrosDelViaje(stops: Stop[]): AchievementDefinition[] {
  return ACHIEVEMENT_DEFS.filter((d) => !d.aplica || d.aplica(stops));
}
