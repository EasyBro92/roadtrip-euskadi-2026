import { describe, expect, it } from "vitest";
import { ExportService } from "../../src/services/export/ExportService";
import { validateExportedState } from "../../src/services/storage/schema";
import { SEED_STOPS } from "../../src/data/stops.data";
import { SEED_TRIP } from "../../src/data/trip.data";
import { DEFAULT_SETTINGS } from "../../src/types";

const exportable = {
  trip: SEED_TRIP,
  stops: SEED_STOPS,
  expenses: [],
  refuels: [],
  favorites: [],
  notes: [],
  checklist: [],
  achievementsState: [],
  settings: DEFAULT_SETTINGS,
};

describe("validateExportedState", () => {
  it("accepts a real export produced by ExportService", () => {
    const exported = ExportService.buildExportedState(exportable);
    const result = validateExportedState(exported);
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing required top-level fields", () => {
    const result = validateExportedState({ schemaVersion: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects a stop with an invalid category instead of silently accepting it", () => {
    const exported = ExportService.buildExportedState(exportable);
    const tampered = { ...exported, stops: [{ ...exported.stops[0], category: "not-a-real-category" }] };
    const result = validateExportedState(tampered);
    expect(result.success).toBe(false);
  });

  it("never executes code from the payload: a __proto__ injection attempt stays inert data", () => {
    const exported = ExportService.buildExportedState(exportable);
    const malicious = JSON.parse(JSON.stringify(exported).replace('"schemaVersion":1', '"schemaVersion":1,"__proto__":{"polluted":true}'));
    validateExportedState(malicious);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
