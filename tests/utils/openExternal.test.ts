import { describe, expect, it } from "vitest";
import { esUrlSegura } from "../../src/utils/openExternal";

describe("esUrlSegura", () => {
  it("deja pasar los enlaces normales", () => {
    expect(esUrlSegura("https://maps.google.com/?q=Getaria")).toBe(true);
    expect(esUrlSegura("http://ejemplo.org")).toBe(true);
  });

  it("deja pasar teléfono y correo, que se usan en la ficha", () => {
    expect(esUrlSegura("tel:+34943000000")).toBe(true);
    expect(esUrlSegura("mailto:hola@ejemplo.org")).toBe(true);
  });

  it("deja pasar blob:, que es como se abren los apuntes adjuntos", () => {
    expect(esUrlSegura("blob:http://localhost:5183/8f0c-abc")).toBe(true);
  });

  it("bloquea javascript:", () => {
    /*
     * Éste es el fallo que había. `stop.officialUrl` entra desde un archivo
     * de viaje importado, y la web de un sitio cercano sale de la etiqueta
     * `website` de OpenStreetMap, que edita cualquiera. Comprobado en el
     * navegador: pulsando "Web oficial" el código se ejecutaba dentro de la
     * app, con acceso a todo lo guardado.
     */
    expect(esUrlSegura("javascript:alert(1)")).toBe(false);
    expect(esUrlSegura("JavaScript:alert(1)")).toBe(false);
    expect(esUrlSegura("  javascript:alert(1)")).toBe(false);
  });

  it("bloquea data: y otros esquemas raros", () => {
    expect(esUrlSegura("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(esUrlSegura("vbscript:msgbox(1)")).toBe(false);
    expect(esUrlSegura("file:///etc/passwd")).toBe(false);
  });

  it("bloquea lo que ni siquiera es una URL", () => {
    expect(esUrlSegura("")).toBe(false);
    expect(esUrlSegura("no es una url")).toBe(false);
  });
});
