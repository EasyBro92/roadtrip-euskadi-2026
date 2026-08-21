/** Genera un ID único. Usa `crypto.randomUUID` (disponible en todos los navegadores objetivo). */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
