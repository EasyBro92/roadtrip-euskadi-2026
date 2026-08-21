import type { CopilotSuggestion } from "../../types";
import { ENV, hasKey } from "../../utils/env";
import type { CopilotContext } from "./localEngine";

/**
 * Motor remoto opcional: llama a un backend propio (ver `server/copilot/`)
 * que a su vez llama a la API de Claude con la clave guardada solo en el
 * servidor. El frontend nunca ve ni envía ninguna clave de IA — solo la URL
 * pública del endpoint, configurada en `VITE_COPILOT_API_URL`.
 */
export const RemoteCopilotEngine = {
  isConfigured(): boolean {
    return hasKey(ENV.COPILOT_API_URL);
  },

  async generate(ctx: CopilotContext): Promise<CopilotSuggestion[]> {
    if (!hasKey(ENV.COPILOT_API_URL)) {
      throw new Error("VITE_COPILOT_API_URL no configurada: el copiloto remoto no está activo.");
    }

    const response = await fetch(ENV.COPILOT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentDayId: ctx.trip.currentDayId,
        currentStopId: ctx.trip.currentStopId,
        now: ctx.now.toISOString(),
        rainModeActive: ctx.rainModeActive,
        remainingBudgetEUR: ctx.remainingBudgetEUR,
        // Solo se envían identificadores y agregados, nunca fotos ni datos personales.
        pendingStopIds: ctx.stops.filter((s) => !s.visited).map((s) => s.id),
      }),
    });

    if (!response.ok) throw new Error(`Backend del copiloto respondió ${response.status}`);

    const data: { suggestions: CopilotSuggestion[] } = await response.json();
    return data.suggestions.map((s) => ({ ...s, generatedBy: "remote" as const }));
  },
};
