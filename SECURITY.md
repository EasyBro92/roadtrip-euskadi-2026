# Seguridad y privacidad

## Principios (sección 47 del encargo)

- **Datos locales por defecto**: todo el estado (viaje, gastos, fotos,
  logros, ajustes) vive en `localStorage` + `IndexedDB` del dispositivo. Nada
  se envía a un servidor salvo que actives explícitamente el copiloto remoto
  (`VITE_COPILOT_API_URL`).
- **Consentimiento explícito para ubicación y cámara**: `LocationService`
  nunca llama a `watchPosition` sin que el usuario pulse un botón
  (`useLocationStore.startTracking`). La cámara solo se activa desde el
  `<input type="file" capture>` del selector de fotos, gestionado por el
  propio navegador/OS.
- **No se exponen claves de API en el frontend**: todas las variables
  `VITE_*` de `.env.example` son URLs o claves de servicios *keyless* de bajo
  riesgo (OSRM, Nominatim). La única clave sensible (`ANTHROPIC_API_KEY` del
  copiloto remoto) vive exclusivamente en el backend de ejemplo
  (`server/copilot/`), leída de `process.env` en tiempo de servidor.
- **Validación de importaciones**: todo JSON importado pasa por
  `services/storage/schema.ts` (Zod). Un payload que no cumpla el esquema se
  rechaza con un mensaje de error, nunca se ejecuta como código —
  `JSON.parse` es la única deserialización usada, jamás `eval` o `Function`.
- **Sin `innerHTML` con contenido del usuario**: todo el texto introducido
  por el usuario (notas, nombres de parada, descripciones) se renderiza como
  texto de React (`{value}`), que escapa automáticamente. El único HTML
  bruto en la app es la atribución de las capas de Leaflet
  (`services/map/MapService.ts`), que es texto estático escrito por nosotros,
  no contenido de usuario.
- **PIN de bloqueo del editor**: si se activa `editLockMode: "pin"`, el PIN
  se debe guardar como hash (campo `pinHash` en el modelo), nunca en texto
  plano. *(La UI para fijar el PIN es la siguiente pieza pendiente del
  editor — ver DECISIONS.md; el campo del modelo ya está preparado para no
  requerir una migración de datos más adelante.)*
- **Sin cifrado prometido**: la app no afirma en ningún sitio que los datos
  están cifrados en reposo, porque `localStorage`/`IndexedDB` no lo están
  por defecto en el navegador. Si necesitas esa garantía, es responsabilidad
  del cifrado de disco del dispositivo.
- **Borrar todos los datos**: `Configuración → Privacidad → Borrar todos los
  datos` limpia `localStorage`, `IndexedDB` (fotos e historial) y resetea el
  estado en memoria. Acción irreversible, con confirmación previa.

## Modo conducción

`settings.drivingModeEnabled` está pensado para reducir interacciones
mientras el vehículo está en marcha (sección 47: "la app no debe distraer
durante la conducción"). El aviso "esta app es orientativa, no la
manipules mientras conduces" se muestra en Configuración y en Ayuda.

## Reporte de problemas de seguridad

Este es un proyecto personal de un solo repositorio local; si lo despliegas
públicamente, añade aquí un canal de contacto real antes de publicarlo.
