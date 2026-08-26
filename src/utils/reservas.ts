import type { ISODate } from "../types";

/**
 * Enlaces de búsqueda a servicios de reserva, con lo que ya sabemos rellenado.
 *
 * No hay acuerdo ni comisión: son las mismas direcciones públicas que
 * escribirías tú, con la ciudad y las fechas puestas para ahorrarte teclear.
 * El hueco de afiliado está preparado — `AFILIADO` — para el día que te des
 * de alta en algún programa; hasta entonces va vacío y no se añade nada.
 *
 * Si algún día se rellena y la app se publica, hay que avisar al usuario de
 * que son enlaces de afiliado: en España es obligatorio.
 */
const AFILIADO = {
  booking: "",
  skyscanner: "",
};

export function urlBooking(ciudad: string, entrada: ISODate, salida: ISODate, adultos = 2): string {
  const params = new URLSearchParams({
    ss: ciudad,
    checkin: entrada,
    checkout: salida,
    group_adults: String(Math.max(1, adultos)),
    // Sin esto Booking asume una habitación y cero niños, que es lo normal.
    no_rooms: "1",
    group_children: "0",
  });
  if (AFILIADO.booking) params.set("aid", AFILIADO.booking);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function urlSkyscanner(destino: string, fecha: ISODate): string {
  const params = new URLSearchParams({ adults: "1", departure_date: fecha, search: destino });
  if (AFILIADO.skyscanner) params.set("associateid", AFILIADO.skyscanner);
  return `https://www.skyscanner.es/transport/flights/?${params.toString()}`;
}

/** El día siguiente en formato ISO. La salida de un hotel es la mañana de después. */
export function diaSiguiente(fecha: ISODate): ISODate {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
