import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve desde /<repo>/, no desde la raíz; Netlify/Vercel usan "/".
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /*
       * "autoUpdate", no "prompt".
       *
       * Con "prompt" el Service Worker nuevo se queda esperando indefinidamente
       * a que la app muestre un diálogo de "hay una actualización" — y no
       * había ninguno. Resultado: el móvil seguía sirviendo para siempre la
       * versión cacheada la primera vez, así que ninguna corrección llegaba
       * nunca al teléfono aunque en el PC (sin SW, servidor de desarrollo)
       * todo funcionase. Con autoUpdate + skipWaiting/clientsClaim, la
       * versión nueva sustituye a la vieja al recargar.
       */
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.svg"],
      manifest: {
        name: "Roadtrip Euskadi 2026",
        short_name: "Euskadi 2026",
        description: "Planificador, diario y copiloto del roadtrip Euskadi 2026 en un Golf 1.9 TDI.",
        theme_color: "#1A73E8",
        background_color: "#FAFAF7",
        display: "standalone",
        orientation: "portrait-primary",
        /*
         * Rutas relativas a propósito: en GitHub Pages la app vive en
         * /<repo>/, así que un "/" absoluto apuntaría a la raíz del dominio
         * y tanto el icono como el ámbito de la PWA fallarían.
         */
        start_url: ".",
        scope: ".",
        lang: "es",
        icons: [
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Estrategia de caché del app shell (JS/CSS/HTML propios).
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // El SW nuevo toma el control inmediatamente en vez de quedarse en
        // espera, y limpia las cachés de versiones anteriores.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Teselas de mapa: CacheFirst con expiración, dentro del límite offline configurable.
            urlPattern: /^https:\/\/(tile\.openstreetmap\.org|.*\.basemaps\.cartocdn\.com|tile\.opentopomap\.org|.*\.tile-cyclosm\.openstreetmap\.fr|server\.arcgisonline\.com)\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-cache",
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/,
            handler: "NetworkFirst",
            options: { cacheName: "routing-cache", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } },
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/,
            handler: "NetworkFirst",
            options: { cacheName: "geocoding-cache", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: false,
    // e2e/ contiene specs de Playwright, no de Vitest.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
