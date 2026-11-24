import { TODAS_LAS_RUTAS } from "../../data/routeTemplates.data";
import { DocumentService } from "../../services/documents/DocumentService";
import { useSavedPlacesStore } from "../../stores/useSavedPlacesStore";
import { useTripStore } from "../../stores/useTripStore";
import type { ExpenseCategory, Stop } from "../../types";
import { fechaLocal } from "../../utils/format";
import { generateId } from "../../utils/id";

export const NOMBRE_VIAJE_DE_EJEMPLO = "Costa Brava · viaje de ejemplo";

function masDias(fecha: Date, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

/** Lo que se añade a cada día de la ruta de la Costa Brava, en el orden en que se hace. */
const EXTRAS: { dia: number; name: string; category: Stop["category"]; lat: number; lon: number; despuesDe?: string }[] = [
  { dia: 1, name: "Catedral de Girona", category: "cultura", lat: 41.9873, lon: 2.8264 },
  { dia: 1, name: "Comida en el Barri Vell", category: "gastronomia", lat: 41.9858, lon: 2.8243 },
  { dia: 1, name: "Alojamiento en Girona", category: "hotel", lat: 41.9818, lon: 2.8196 },
  { dia: 2, name: "Vila Vella de Tossa", category: "historia", lat: 41.7177, lon: 2.933, despuesDe: "Tossa de Mar" },
  { dia: 2, name: "Cena en Calella", category: "gastronomia", lat: 41.8889, lon: 3.1815 },
  { dia: 2, name: "Alojamiento en Palafrugell", category: "hotel", lat: 41.917, lon: 3.163 },
  { dia: 3, name: "Castillo de Begur", category: "castillo", lat: 41.9567, lon: 3.2075, despuesDe: "Begur" },
  { dia: 3, name: "Casa-Museo Dalí, Portlligat", category: "cultura", lat: 42.2928, lon: 3.2862 },
  { dia: 3, name: "Alojamiento en Cadaqués", category: "hotel", lat: 42.2885, lon: 3.277 },
  { dia: 4, name: "Faro de Cap de Creus", category: "mirador", lat: 42.3192, lon: 3.3159 },
];

/**
 * Crea un viaje completo para ver la app funcionando sin tener que rellenar
 * nada: cuatro días por la Costa Brava que empezaron ayer, con el primer día
 * hecho, el de hoy a medias, alojamiento cada noche, gastos repartidos entre
 * dos, un repostaje, el diario escrito, reservas con cancelación y sitios
 * guardados para ir.
 *
 * Si ya existe, sólo lo abre: no se duplica al pulsar dos veces.
 */
export async function crearViajeDeEjemplo(): Promise<void> {
  const tienda = useTripStore.getState();
  const existente = tienda.listTrips().find((t) => t.name === NOMBRE_VIAJE_DE_EJEMPLO);
  if (existente) {
    if (!existente.isActive) tienda.switchTrip(existente.id);
    return;
  }

  const plantilla = TODAS_LAS_RUTAS.find((r) => r.id === "ruta-costa-brava");
  if (!plantilla) return;

  const hoy = new Date();
  const inicio = masDias(hoy, -1);
  tienda.createTripFromTemplate(plantilla, inicio);

  const s = () => useTripStore.getState();
  const ana = { id: generateId("traveler"), name: "Ana", color: "#2563EB" };
  const marc = { id: generateId("traveler"), name: "Marc", color: "#EC4899" };
  s().setTripMeta({ name: NOMBRE_VIAJE_DE_EJEMPLO, budgetEUR: 1100, travelers: [ana, marc] });

  const dias = s().trip.days;
  const ciudades = ["Girona", "Tossa de Mar", "Cadaqués", "Cadaqués"];
  dias.forEach((d, i) => ciudades[i] && s().updateDay(d.id, { city: ciudades[i] }));

  // Paradas extra, cada una en su sitio del día.
  for (const extra of EXTRAS) {
    const dia = dias[extra.dia - 1];
    if (!dia) continue;
    const id = s().addStop(dia.id, { name: extra.name, category: extra.category, coordinates: { latitude: extra.lat, longitude: extra.lon } });
    if (extra.despuesDe) {
      const orden = s().trip.days.find((d) => d.id === dia.id)!.stopIds.filter((x) => x !== id);
      const tras = orden.findIndex((x) => s().stopsById[x]?.name === extra.despuesDe);
      orden.splice(tras + 1, 0, id);
      s().reorderStopsInDay(dia.id, orden);
    }
  }

  // Ayer, todo visto; hoy, las dos primeras paradas.
  const delDia = (i: number) => s().trip.days[i]?.stopIds ?? [];
  delDia(0).forEach((id) => s().setStopVisited(id, true));
  delDia(1)
    .slice(0, 2)
    .forEach((id) => s().setStopVisited(id, true));

  const ayer = inicio;
  const hoyISO = fechaLocal(hoy);
  const gasto = (date: string, dia: number, amountEUR: number, category: ExpenseCategory, place: string, time: string, pagaAna: boolean) =>
    s().addExpense({
      date,
      time,
      amountEUR,
      category,
      place,
      dayId: dias[dia]?.id ?? null,
      stopId: s().trip.days[dia]?.stopIds.map((id) => s().stopsById[id]).find((p) => p?.name === place)?.id ?? null,
      paidByTravelerId: pagaAna ? ana.id : marc.id,
      splitBetweenTravelerIds: [ana.id, marc.id],
      paymentMethod: "tarjeta",
      notes: "",
      receiptPhotoId: null,
      kind: "actual",
    });
  gasto(ayer, 0, 62.4, "combustible", "Gasolinera de salida", "08:40", true);
  gasto(ayer, 0, 8.15, "peaje", "AP-7", "09:55", true);
  gasto(ayer, 0, 6.5, "aparcamiento", "Girona", "10:20", false);
  gasto(ayer, 0, 15, "entrada", "Catedral de Girona", "11:05", false);
  gasto(ayer, 0, 54.8, "restaurante", "Comida en el Barri Vell", "14:10", true);
  gasto(ayer, 0, 118, "hotel", "Alojamiento en Girona", "19:30", false);
  gasto(hoyISO, 1, 12.35, "compra", "Tossa de Mar", "10:15", true);
  gasto(hoyISO, 1, 41.2, "restaurante", "Tossa de Mar", "14:00", false);

  s().addRefuel({
    vehicleId: s().trip.vehicle.id,
    date: ayer,
    place: "Gasolinera de salida",
    odometerKm: s().trip.vehicle.odometerStartKm + 12,
    liters: 41.6,
    pricePerLiter: 1.5,
    fullTank: true,
    notes: "",
  });

  s().addNote({
    targetType: "day",
    targetId: dias[0].id,
    text: "Primer día redondo. Girona por la mañana, la catedral con sus escaleras y comida larga en el Barri Vell. Paseo al atardecer por las casas de colores del Onyar.",
    tags: [],
    favorite: true,
  });
  s().addNote({
    targetType: "day",
    targetId: dias[1].id,
    text: "Tossa a primera hora, sin gente. Subida a la Vila Vella y baño en la playa de abajo. Por la tarde, a Calella.",
    tags: [],
    favorite: false,
  });

  // Reservas: una confirmada, otra con la cancelación gratuita a punto de vencer y sin pagar.
  await DocumentService.guardar({ dayId: dias[0].id, titulo: "Alojamiento en Girona", tipo: "reserva", localizador: "EJ-48213", fecha: ayer, hora: "15:00" });
  await DocumentService.guardar({
    dayId: dias[1].id,
    titulo: "Alojamiento en Palafrugell",
    tipo: "reserva",
    localizador: "EJ-77105",
    fecha: hoyISO,
    hora: "16:00",
    cancelacionHasta: hoyISO,
    pendiente: true,
  });
  await DocumentService.guardar({
    dayId: dias[2].id,
    titulo: "Alojamiento en Cadaqués",
    tipo: "reserva",
    localizador: "EJ-90331",
    fecha: masDias(hoy, 1),
    hora: "15:00",
    cancelacionHasta: masDias(hoy, 1),
  });

  const guardados = useSavedPlacesStore.getState();
  guardados.guardar({ nombre: "Cala Aiguablava", coordinates: { latitude: 41.9356, longitude: 3.2179 }, categoria: "playa" });
  guardados.guardar({ nombre: "Monasterio de Sant Pere de Rodes", coordinates: { latitude: 42.3233, longitude: 3.1658 }, categoria: "historia" });

  s().sincronizarDiaDeHoy();
}
