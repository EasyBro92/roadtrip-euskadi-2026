export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/**
 * "Sábado, 29 de agosto" — con mayúscula sólo al principio.
 *
 * En español el día y el mes van en minúscula, y el sistema los devuelve así
 * ("sábado, 29 de agosto"). Quien lo pintaba le ponía un `capitalize` de CSS
 * encima para arreglar la inicial, pero eso pone mayúscula a **cada palabra**
 * y salía "Sábado, 29 De Agosto", con un "De" en mitad de la frase.
 *
 * Poniéndola aquí, en el texto y no en el estilo, sólo sube la primera letra
 * y quien lo use no tiene que acordarse de nada.
 */
export function formatDateLong(isoDate: string): string {
  const texto = new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatDateShort(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

/**
 * La fecha de hoy tal y como la ve quien mira el reloj, en formato ISO.
 *
 * `toISOString()` da la fecha en UTC, y en España en verano vamos dos horas
 * por delante: entre las 00:00 y las 02:00 devuelve todavía el día anterior.
 * Una cena apuntada a las 00:30 se guardaba con la fecha de ayer, y el día
 * del viaje que sale al abrir la app tampoco sería el correcto a esa hora.
 */
export function fechaLocal(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
