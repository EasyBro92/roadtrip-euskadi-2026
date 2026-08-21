import type { CopilotEngineMode, CopilotSuggestion } from "../../types";
import { type CopilotContext, generateLocalSuggestions } from "./localEngine";
import { RemoteCopilotEngine } from "./remoteEngine";

export const CopilotService = {
  currentMode(): CopilotEngineMode {
    return RemoteCopilotEngine.isConfigured() ? "remote" : "local";
  },

  /** Nunca lanza: si el modo remoto falla, degrada automáticamente al motor local. */
  async getSuggestions(ctx: CopilotContext, preferRemote = true): Promise<{ suggestions: CopilotSuggestion[]; mode: CopilotEngineMode }> {
    if (preferRemote && RemoteCopilotEngine.isConfigured()) {
      try {
        const suggestions = await RemoteCopilotEngine.generate(ctx);
        return { suggestions, mode: "remote" };
      } catch (error) {
        console.warn("[CopilotService] Motor remoto falló, usando motor local", error);
      }
    }
    return { suggestions: generateLocalSuggestions(ctx), mode: "local" };
  },
};
