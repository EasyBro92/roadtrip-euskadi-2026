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

export function formatDateLong(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
