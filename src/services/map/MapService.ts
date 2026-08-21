import type { MapLayerId } from "../../types";

export interface MapLayerDefinition {
  id: MapLayerId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  requiresApiKey: boolean;
  available: boolean;
}

/**
 * Capas de mapa (sección 11). Todas las incluidas por defecto son de
 * proveedores que no requieren clave y cuyas condiciones de uso permiten
 * este tipo de consumo de bajo volumen, con atribución visible obligatoria.
 * Satélite usa Esri World Imagery (keyless, uso general permitido).
 */
export const MAP_LAYERS: MapLayerDefinition[] = [
  {
    id: "classic",
    label: "Mapa clásico",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    requiresApiKey: false,
    available: true,
  },
  {
    id: "light",
    label: "Mapa claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    requiresApiKey: false,
    available: true,
  },
  {
    id: "dark",
    label: "Mapa oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    requiresApiKey: false,
    available: true,
  },
  {
    id: "relief",
    label: "Relieve",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    requiresApiKey: false,
    available: true,
  },
  {
    id: "cycling",
    label: "Ciclismo / senderismo",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors | Tiles: <a href="https://www.cyclosm.org">CyclOSM</a>',
    maxZoom: 20,
    requiresApiKey: false,
    available: true,
  },
  {
    id: "satellite",
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    requiresApiKey: false,
    available: true,
  },
];

export const DEFAULT_TILE_SUBDOMAINS = ["a", "b", "c"];

export function getMapLayer(id: MapLayerId): MapLayerDefinition {
  return MAP_LAYERS.find((l) => l.id === id) ?? MAP_LAYERS[0];
}
