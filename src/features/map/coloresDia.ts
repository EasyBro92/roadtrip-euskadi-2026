/** Un color por día en la vista del viaje entero: distintos entre sí y legibles sobre el mapa. */
export const COLORES_DIA = ["#4285F4", "#EA4335", "#34A853", "#F9AB00", "#A142F4", "#00ACC1", "#FF6D01", "#E52592"];

export function colorDelDia(indice: number): string {
  return COLORES_DIA[indice % COLORES_DIA.length];
}
