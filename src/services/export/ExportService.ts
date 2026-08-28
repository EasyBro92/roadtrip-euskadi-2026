import type { AchievementState, AppSettings, ChecklistItem, Expense, Favorite, Note, Refuel, Stop, Trip } from "../../types";
import type { ExportedState } from "../storage/schema";
import { triggerDownload } from "../../utils/download";
import { nombreArchivo } from "../../utils/nombreArchivo";

export interface ExportableState {
  trip: Trip;
  stops: Stop[];
  expenses: Expense[];
  refuels: Refuel[];
  favorites: Favorite[];
  notes: Note[];
  checklist: ChecklistItem[];
  achievementsState: AchievementState[];
  settings: AppSettings;
}

export const ExportService = {
  buildExportedState(state: ExportableState): ExportedState {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      trip: state.trip as unknown as ExportedState["trip"],
      stops: state.stops as unknown as ExportedState["stops"],
      expenses: state.expenses as unknown as ExportedState["expenses"],
      refuels: state.refuels as unknown as ExportedState["refuels"],
      favorites: state.favorites as unknown as ExportedState["favorites"],
      notes: state.notes as unknown as ExportedState["notes"],
      checklist: state.checklist as unknown as ExportedState["checklist"],
      achievementsState: state.achievementsState as unknown as ExportedState["achievementsState"],
      settings: state.settings as unknown as ExportedState["settings"],
    };
  },

  downloadJSON(state: ExportableState): void {
    const exported = this.buildExportedState(state);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    // Con el nombre del viaje, no con el del repositorio: en Descargas, seis
    // meses después, "roadtrip-euskadi-2026-..." era el nombre de todos.
    triggerDownload(blob, `${nombreArchivo(state.trip.name, "viaje")}-${exported.exportedAt.slice(0, 10)}.json`);
  },

  downloadCSV(csvContent: string, filename: string): void {
    // Prefijo BOM para que Excel en Windows detecte UTF-8 correctamente con tildes/ñ.
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
  },

  /** GPX de la ruta (sección 44): un track con las paradas habilitadas, ordenadas por día y orden. */
  downloadGPX(trip: Trip, stops: Stop[]): void {
    const orderedStops = trip.days.flatMap((day) => day.stopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => s != null && s.enabled));

    const trackPoints = orderedStops.map((s) => `      <trkpt lat="${s.coordinates.latitude}" lon="${s.coordinates.longitude}"><name>${escapeXml(s.name)}</name></trkpt>`).join("\n");
    const waypoints = orderedStops
      .map((s) => `  <wpt lat="${s.coordinates.latitude}" lon="${s.coordinates.longitude}"><name>${escapeXml(s.name)}</name><type>${s.category}</type></wpt>`)
      .join("\n");

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Easy Travel" xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
  <trk>
    <name>${escapeXml(trip.name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    triggerDownload(blob, `${slugify(trip.name)}.gpx`);
  },

  /** GeoJSON de todas las paradas (sección 44), con propiedades útiles para reimportar en otras herramientas. */
  downloadGeoJSON(stops: Stop[]): void {
    const geojson = {
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.coordinates.longitude, s.coordinates.latitude] },
        properties: { id: s.id, name: s.name, category: s.category, dayId: s.dayId, order: s.order, visited: s.visited },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    triggerDownload(blob, "roadtrip-euskadi-2026-paradas.geojson");
  },
};

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
