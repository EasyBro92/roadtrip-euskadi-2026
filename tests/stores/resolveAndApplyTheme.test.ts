import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAndApplyTheme } from "../../src/stores/useSettingsStore";

/** Finge la preferencia del sistema operativo. */
function sistemaEnOscuro(oscuro: boolean) {
  vi.stubGlobal("matchMedia", (consulta: string) => ({
    matches: consulta.includes("prefers-color-scheme: dark") ? oscuro : false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const tema = () => document.documentElement.getAttribute("data-theme");

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
});

describe("resolveAndApplyTheme", () => {
  it("en automático con el sistema en oscuro, se pone oscuro", () => {
    /*
     * Éste es el fallo que había: en automático se **quitaba** el atributo, y
     * el CSS del oscuro automático buscaba `[data-theme="auto"]`, que ya no
     * podía casar con nada. El modo automático nunca llegó a ponerse oscuro.
     */
    sistemaEnOscuro(true);
    resolveAndApplyTheme("auto");
    expect(tema()).toBe("dark");
  });

  it("en automático con el sistema en claro, se pone claro", () => {
    sistemaEnOscuro(false);
    resolveAndApplyTheme("auto");
    expect(tema()).toBe("light");
  });

  it("el ajuste manual manda sobre el sistema", () => {
    sistemaEnOscuro(true);
    resolveAndApplyTheme("light");
    expect(tema()).toBe("light");

    sistemaEnOscuro(false);
    resolveAndApplyTheme("dark");
    expect(tema()).toBe("dark");
  });

  it("siempre deja el atributo puesto, nunca a medias", () => {
    // El CSS decide con este atributo: sin él, no hay tema que aplicar.
    sistemaEnOscuro(false);
    for (const t of ["auto", "light", "dark"] as const) {
      resolveAndApplyTheme(t);
      expect(["light", "dark"]).toContain(tema());
    }
  });
});
