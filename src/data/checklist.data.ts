import type { ChecklistItem } from "../types";

let counter = 0;
function item(category: ChecklistItem["category"], label: string): ChecklistItem {
  counter += 1;
  return { id: `checklist-${counter}`, category, label, checked: false, isCustom: false };
}

export const SEED_CHECKLIST: ChecklistItem[] = [
  item("documentacion", "DNI"),
  item("documentacion", "Permiso de conducir"),
  item("documentacion", "Documentación del vehículo"),
  item("documentacion", "Seguro"),
  item("documentacion", "Tarjeta sanitaria"),
  item("documentacion", "Reservas"),

  item("vehiculo", "Combustible"),
  item("vehiculo", "Neumáticos"),
  item("vehiculo", "Aceite"),
  item("vehiculo", "Refrigerante"),
  item("vehiculo", "Luces"),
  item("vehiculo", "Baliza V16"),
  item("vehiculo", "Chaleco"),
  item("vehiculo", "Kit antipinchazos"),

  item("tecnologia", "Móvil"),
  item("tecnologia", "Cargador"),
  item("tecnologia", "Cable"),
  item("tecnologia", "Powerbank"),
  item("tecnologia", "Contenido offline descargado"),

  item("viaje", "Equipaje"),
  item("viaje", "Gafas de sol"),
  item("viaje", "Agua"),
  item("viaje", "Cámara"),
  item("viaje", "Reservas impresas"),
];
