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

describe("la copia completa lleva lo que no está en ningún otro sitio", () => {
  const aportaciones = [{ id: "ap-1", travelerId: "yulia", amountEUR: 292.97, date: "2026-08-29", notes: "", createdAt: "" }];
  const valoraciones = { "stop:gaztelugatxe": { tipo: "stop", targetId: "gaztelugatxe", estrellas: 5, fecha: "2026-09-01" } };
  const sitiosGuardados = { listas: [{ id: "l1", nombre: "Quiero ir", createdAt: "" }], lugares: [{ id: "s1", listaId: "l1", nombre: "Bayona" }] };

  it("exporta el bote, las puntuaciones y los sitios guardados", () => {
    /*
     * Lo que hizo falta arreglar después del viaje de Euskadi: la copia
     * "completa" no traía nada de esto. Con 292,97 € de gastos pagados del
     * bote, restaurarla dejaba ese dinero sin que lo hubiera puesto nadie.
     */
    const exportado = ExportService.buildExportedState({ ...exportable, aportaciones, valoraciones, sitiosGuardados } as never);

    expect(exportado.aportaciones).toHaveLength(1);
    expect(exportado.valoraciones).toEqual(valoraciones);
    expect(exportado.sitiosGuardados?.lugares).toHaveLength(1);
  });

  it("y sobrevive a la validación de la vuelta", () => {
    const exportado = ExportService.buildExportedState({ ...exportable, aportaciones, valoraciones, sitiosGuardados } as never);
    const leido = validateExportedState(JSON.parse(JSON.stringify(exportado)));

    expect(leido.success).toBe(true);
    if (leido.success) {
      expect(leido.data.aportaciones).toHaveLength(1);
      expect(leido.data.sitiosGuardados?.listas).toHaveLength(1);
    }
  });

  it("una copia antigua, sin nada de esto, sigue valiendo", () => {
    // Los ficheros que ya se hayan guardado tienen que poder restaurarse.
    const antiguo = ExportService.buildExportedState(exportable as never);
    delete (antiguo as Record<string, unknown>).aportaciones;
    delete (antiguo as Record<string, unknown>).valoraciones;
    delete (antiguo as Record<string, unknown>).sitiosGuardados;

    expect(validateExportedState(JSON.parse(JSON.stringify(antiguo))).success).toBe(true);
  });
});
