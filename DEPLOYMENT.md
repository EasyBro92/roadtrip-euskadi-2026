# Despliegue

La app es una SPA estática tras `npm run build` (todo en `dist/`) — no
requiere servidor Node en producción salvo que actives el backend opcional
del copiloto (`server/copilot/`, ver su propio README).

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build   # tsc -b && vite build → genera dist/
npm run preview # sirve dist/ localmente para probar el build
```

## Netlify

`netlify.toml` ya está configurado (build command, publish dir, SPA
fallback). Solo hace falta conectar el repositorio. Si usas alguna variable
`VITE_*` de `.env.example`, añádela en Site settings → Environment variables.

## Vercel

`vercel.json` ya está configurado igual que Netlify (rewrites SPA + headers
del Service Worker). `vercel --prod` o conectar el repo desde el dashboard.

## GitHub Pages

`.github/workflows/deploy.yml` compila y publica a Pages en cada push a
`main`. Como Pages sirve desde `/<repositorio>/` y no desde la raíz, el
workflow define `VITE_BASE_PATH=/roadtrip-euskadi-2026/`, que `vite.config.ts`
usa como `base`. Si el repositorio se llama distinto, actualiza esa ruta en
el workflow. Activa Pages con "GitHub Actions" como fuente en Settings →
Pages.

## Servidor estático propio / Docker

```bash
docker compose up --build
```

Sirve la SPA con nginx en `http://localhost:8085`. `nginx.conf` incluye el
fallback de SPA y evita cachear `sw.js` (para que las actualizaciones del
Service Worker lleguen a los usuarios).

Sin Docker, cualquier servidor estático con fallback a `index.html` sirve
(Caddy, `serve -s dist`, un bucket S3+CloudFront con error document...).

## Diferencias de rutas y variables entre plataformas

| Plataforma | `base` de Vite | Variables de entorno |
|---|---|---|
| Netlify / Vercel | `/` (raíz de dominio propio) | Panel de la plataforma |
| GitHub Pages | `/<repo>/` | Secrets del repo / `env:` del workflow |
| Docker / nginx | `/` (raíz del contenedor) | `.env` en build time (Vite embebe `VITE_*` en el bundle) |

Importante: las variables `VITE_*` se incrustan en el bundle **en tiempo de
build**, no de ejecución. Si cambias una `VITE_*`, hay que rebuildear y
redesplegar, no basta con reiniciar el contenedor.
