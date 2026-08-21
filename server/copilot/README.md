# Backend de ejemplo — Copiloto IA (opcional)

Este endpoint es **completamente opcional**. La app funciona sin él: el
copiloto local basado en reglas (`src/services/copilot/localEngine.ts`) es
el motor por defecto y no requiere red ni configuración.

Este ejemplo existe para cumplir la sección 37 del encargo: "integración
opcional con API de IA mediante backend seguro", sin exponer nunca una clave
en el frontend.

## Cómo activarlo

1. Despliega `index.ts` como función serverless (Vercel Functions, Netlify
   Functions, Cloudflare Workers o un servidor Node propio). El handler usa
   la Web `Request`/`Response` estándar (compatible con Vercel Edge Functions
   y Cloudflare Workers sin cambios; para Netlify Functions clásicas envuelve
   `handler` en el formato `(event) => {...}` de Netlify).
2. Configura la variable de entorno **en el servidor**, nunca en el frontend:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. En el `.env` del frontend (ver `.env.example` en la raíz del proyecto):
   ```bash
   VITE_COPILOT_API_URL=https://tu-despliegue.example.com/api/copilot
   ```
4. Redespliega el frontend. `CopilotService` detectará la URL y probará el
   motor remoto primero, cayendo al motor local si la petición falla.

## Qué datos recibe

Solo un resumen agregado del estado del viaje (IDs de día/parada actual,
hora, modo lluvia, presupuesto restante, IDs de paradas pendientes). Nunca
se envían fotos, notas personales ni datos de otros viajeros.
