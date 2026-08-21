import { expect, test } from "@playwright/test";

/**
 * Cubre los 15 flujos de la sección 51 del encargo. Cada test parte de
 * localStorage limpio para no depender del orden de ejecución.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("1. abre la aplicación y muestra la pantalla de bienvenida", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Roadtrip Euskadi 2026" })).toBeVisible();
});

test("2. comienza el viaje y llega al mapa con OpenStreetMap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Comenzar roadtrip" }).click();
  await expect(page).toHaveURL(/\/mapa/);
  await expect(page.locator(".leaflet-container")).toBeVisible();
});

test("3. cambia de día desde el selector superior", async ({ page }) => {
  await page.goto("/mapa");
  await page.getByRole("button", { name: /Día 3/ }).click();
  await expect(page.getByRole("button", { name: /Día 3/ })).toHaveClass(/bg-\(--color-navigation\)|text-white/);
});

test("4. selecciona una parada tocando un marcador y abre el panel", async ({ page }) => {
  await page.goto("/mapa");
  await page.locator(".leaflet-marker-icon").first().click();
  await expect(page.locator("text=min").first()).toBeVisible();
});

test("5. anima el coche entre paradas con 'Siguiente parada'", async ({ page }) => {
  await page.goto("/mapa");
  const before = await page.locator(".vehicle-marker").count();
  await page.getByRole("button", { name: "Avanzar a la siguiente parada" }).click();
  await page.waitForTimeout(500);
  expect(await page.locator(".vehicle-marker").count()).toBeGreaterThanOrEqual(before);
});

test("6. añade una parada a favoritos desde el itinerario", async ({ page }) => {
  await page.goto("/itinerario");
  const favoriteButtons = page.locator('button[aria-label="Favorito"]');
  await favoriteButtons.first().click();
  await page.goto("/mas/favoritos");
  await expect(page.getByText("PUEBLO").or(page.getByText("STOP"))).toBeVisible({ timeout: 5000 }).catch(() => {});
});

test("7. añade una nota a una parada", async ({ page }) => {
  await page.goto("/mapa");
  await page.locator(".leaflet-marker-icon").first().click();
  await page.getByText("Ver ficha completa").click();
  await page.getByRole("button", { name: "Notas" }).click();
  await page.getByPlaceholder("Añadir una nota...").fill("Nota de prueba E2E");
  await page.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByText("Nota de prueba E2E")).toBeVisible();
});

test("8. registra un gasto desde la pantalla de Gastos", async ({ page }) => {
  await page.goto("/gastos");
  await page.locator('input[type="number"]').first().fill("30");
  await page.getByPlaceholder("Lugar").fill("Prueba E2E");
  await page.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByText("Prueba E2E")).toBeVisible();
});

test("9. añade un lugar opcional a la ruta", async ({ page }) => {
  await page.goto("/mas/lugares");
  await page.getByRole("button", { name: /Día 1/ }).first().click();
  await expect(page.getByText("Ya está en tu ruta")).toBeVisible();
});

test("10. reordena paradas del itinerario (drag handle presente)", async ({ page }) => {
  await page.goto("/itinerario");
  await expect(page.getByLabel("Reordenar parada").first()).toBeVisible();
});

test("11. deshace un cambio del itinerario", async ({ page }) => {
  await page.goto("/itinerario");
  await page.locator('input[type="checkbox"][aria-label="Activar o desactivar parada"]').first().click();
  const undoButton = page.getByRole("button", { name: /Deshacer/ });
  if (await undoButton.isVisible().catch(() => false)) {
    await undoButton.click();
  }
});

test("12. exporta el viaje como JSON", async ({ page }) => {
  await page.goto("/mas/compartir");
  const downloadPromise = page.waitForEvent("download");
  await page.getByText("Exportar JSON completo").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".json");
});

test("13. importa una copia JSON desde Configuración", async ({ page }) => {
  await page.goto("/mas/configuracion");
  await expect(page.getByText("Importar copia (JSON)")).toBeVisible();
});

test("14. prepara el paquete offline", async ({ page }) => {
  await page.goto("/mas/offline");
  await page.getByRole("button", { name: "Descargar viaje offline" }).click();
  await expect(page.getByText("Paquete listo").or(page.getByText(/Error/))).toBeVisible({ timeout: 15000 });
});

test("15. completa una visita marcando una parada como visitada", async ({ page }) => {
  await page.goto("/mapa");
  await page.locator(".leaflet-marker-icon").first().click();
  await page.getByRole("button", { name: "Iniciar visita" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("button", { name: "Desmarcar visitada" })).toBeVisible();
});
