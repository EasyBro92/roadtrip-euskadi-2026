/**
 * Ejemplo de backend seguro para el copiloto remoto (sección 37 y 47: "nunca
 * exponer una clave de IA en el frontend").
 *
 * Esta función NO se compila ni se sirve como parte de la SPA de Vite — es
 * un ejemplo de función serverless (compatible con Vercel/Netlify Functions
 * o cualquier runtime Node) que el usuario despliega por separado. Lee
 * `ANTHROPIC_API_KEY` solo del entorno del servidor; el frontend únicamente
 * conoce la URL pública de este endpoint (`VITE_COPILOT_API_URL`).
 *
 * Despliegue rápido (Vercel):
 *   1. Copiar esta carpeta `server/copilot` a un proyecto Vercel con
 *      Functions habilitadas (o usar `vercel dev` desde la raíz si se migra
 *      a `api/copilot.ts`).
 *   2. `vercel env add ANTHROPIC_API_KEY` (nunca como variable VITE_*).
 *   3. Configurar `VITE_COPILOT_API_URL=https://tu-proyecto.vercel.app/api/copilot`
 *      en el `.env` del frontend.
 *
 * Si no se despliega nada, la app sigue funcionando: `CopilotService`
 * detecta que `VITE_COPILOT_API_URL` no existe y usa siempre el motor local.
 */

interface CopilotRequestBody {
  currentDayId: string | null;
  currentStopId: string | null;
  now: string;
  rainModeActive: boolean;
  remainingBudgetEUR: number | null;
  pendingStopIds: string[];
}

interface CopilotSuggestionResponse {
  id: string;
  kind: string;
  title: string;
  message: string;
  reason: string;
  relatedStopId?: string;
  priority: number;
}

const SYSTEM_PROMPT = `Eres el copiloto de un roadtrip por Euskadi. Recibes un contexto JSON (día
actual, hora, modo lluvia, presupuesto restante, paradas pendientes) y debes
devolver EXCLUSIVAMENTE un JSON con la forma { "suggestions": CopilotSuggestion[] }.
Cada sugerencia debe incluir un "reason" honesto basado solo en los datos
recibidos: no inventes horarios, precios ni disponibilidad reales.`;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada en el servidor" }), { status: 500 });
  }

  const body = (await request.json()) as CopilotRequestBody;

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(body) }],
    }),
  });

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return new Response(JSON.stringify({ error: `Anthropic API error: ${errorText}` }), { status: 502 });
  }

  const data = await anthropicResponse.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === "text");

  let suggestions: CopilotSuggestionResponse[] = [];
  try {
    suggestions = JSON.parse(textBlock?.text ?? "{}").suggestions ?? [];
  } catch {
    suggestions = [];
  }

  return new Response(JSON.stringify({ suggestions }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
