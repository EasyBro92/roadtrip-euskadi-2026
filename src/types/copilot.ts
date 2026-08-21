import type { ID } from "./common";

export type CopilotSuggestionKind =
  | "next-stop"
  | "skip-stop"
  | "meal-time"
  | "parking"
  | "photo-spot"
  | "scenic-route"
  | "return-to-hotel"
  | "day-overloaded"
  | "rain-alternative";

export type CopilotEngineMode = "local" | "remote";

/** Sugerencia siempre explicable: `reason` es obligatorio y se muestra en la UI. */
export interface CopilotSuggestion {
  id: ID;
  kind: CopilotSuggestionKind;
  title: string;
  message: string;
  reason: string;
  relatedStopId?: ID;
  priority: number;
  generatedBy: CopilotEngineMode;
  generatedAt: string;
}
