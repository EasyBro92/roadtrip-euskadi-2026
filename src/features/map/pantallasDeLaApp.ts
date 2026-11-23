/**
 * Las pantallas de la app que se pueden encontrar desde el buscador del
 * mapa, con las palabras que alguien escribiría para llegar a ellas.
 *
 * Así "gastos", "hotel" o "fotos" te llevan a su pantalla aunque no sepas en
 * qué pestaña o en qué rincón de "Más" vive.
 */
export interface PantallaDeLaApp {
  ruta: string;
  nombre: string;
  palabras: string[];
}

export const PANTALLAS_DE_LA_APP: PantallaDeLaApp[] = [
  { ruta: "/itinerario", nombre: "Itinerario", palabras: ["itinerario", "paradas", "dias", "plan", "ruta"] },
  { ruta: "/diario", nombre: "Diario", palabras: ["diario", "escribir", "recuerdos", "hoy"] },
  { ruta: "/gastos", nombre: "Gastos", palabras: ["gastos", "dinero", "pagar", "cuentas", "presupuesto", "bote", "deudas"] },
  { ruta: "/mas/dormir", nombre: "Dónde dormir", palabras: ["dormir", "hotel", "alojamiento", "noche", "booking"] },
  { ruta: "/mas/documentos", nombre: "Reservas y documentos", palabras: ["reservas", "documentos", "billetes", "entradas", "seguro", "cancelacion"] },
  { ruta: "/mas/album", nombre: "Álbum de fotos", palabras: ["fotos", "album", "imagenes", "galeria"] },
  { ruta: "/mas/coche", nombre: "Mi coche", palabras: ["coche", "gasolina", "gasoil", "repostar", "combustible", "consumo"] },
  { ruta: "/mas/checklist", nombre: "Lista de equipaje", palabras: ["checklist", "equipaje", "maleta", "lista"] },
  { ruta: "/mas/guardados", nombre: "Quiero ir", palabras: ["guardados", "quiero ir", "pendientes"] },
  { ruta: "/mas/favoritos", nombre: "Favoritos", palabras: ["favoritos"] },
  { ruta: "/mas/logros", nombre: "Logros", palabras: ["logros", "medallas", "premios"] },
  { ruta: "/mas/regreso", nombre: "Vuelta a casa", palabras: ["vuelta", "regreso", "casa", "volver"] },
  { ruta: "/mas/notas", nombre: "Notas", palabras: ["notas", "apuntes"] },
  { ruta: "/mas/offline", nombre: "Sin conexión", palabras: ["offline", "sin conexion", "descargar", "mapas"] },
  { ruta: "/mas/compartir", nombre: "Compartir el viaje", palabras: ["compartir", "enviar", "exportar"] },
  { ruta: "/mas/configuracion", nombre: "Ajustes", palabras: ["ajustes", "configuracion", "viajeros", "peajes", "tema", "oscuro"] },
  { ruta: "/resumen", nombre: "Resumen del viaje", palabras: ["resumen", "estadisticas", "kilometros"] },
];

/** Las pantallas que encajan con lo escrito (ya en minúsculas y sin tildes). */
export function pantallasQueCoinciden(q: string, max = 2): PantallaDeLaApp[] {
  if (q.length < 3) return [];
  return PANTALLAS_DE_LA_APP.filter((p) => p.palabras.some((w) => w.startsWith(q) || (q.length >= 4 && w.includes(q)))).slice(0, max);
}
