import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { TituloPantalla } from "../../src/components/TituloPantalla";

/** Una pantalla como Gastos o Más: todo dentro de un contenedor que scrollea. */
function pantallaQueScrollea() {
  return render(
    <div data-testid="scroller" style={{ overflowY: "auto", height: "200px" }}>
      <TituloPantalla>Gastos</TituloPantalla>
      <div style={{ height: "2000px" }} />
    </div>,
  );
}

function desplazar(scroller: HTMLElement, top: number) {
  act(() => {
    scroller.scrollTop = top;
    // En jsdom asignar scrollTop no dispara el evento; en el navegador de
    // pruebas tampoco lo hacía, y por eso esta comprobación vive aquí.
    scroller.dispatchEvent(new Event("scroll"));
  });
}

const esCompacto = () => screen.getByRole("heading").className.includes("text-base");

describe("TituloPantalla", () => {
  it("empieza grande", () => {
    pantallaQueScrollea();
    expect(esCompacto()).toBe(false);
  });

  it("se encoge al desplazar", () => {
    const { getByTestId } = pantallaQueScrollea();
    desplazar(getByTestId("scroller"), 200);
    expect(esCompacto()).toBe(true);
  });

  it("vuelve a crecer al subir del todo", () => {
    // La ida es fácil; lo que se olvida es la vuelta.
    const { getByTestId } = pantallaQueScrollea();
    const scroller = getByTestId("scroller");

    desplazar(scroller, 200);
    expect(esCompacto()).toBe(true);

    desplazar(scroller, 0);
    expect(esCompacto()).toBe(false);
  });

  it("un roce de unos pocos píxeles no lo encoge", () => {
    // Asomarse no es leer: con el umbral a cero, el título bailaría con el
    // rebote elástico del móvil sin que nadie haya desplazado nada.
    const { getByTestId } = pantallaQueScrollea();
    desplazar(getByTestId("scroller"), 8);
    expect(esCompacto()).toBe(false);
  });

  it("sin contenedor desplazable se queda grande", () => {
    /*
     * Es el caso de Itinerario y Diario: el título vive fuera de la zona que
     * se desplaza. Ahí no hay hueco que recuperar —el título no se va nunca—
     * así que lo correcto es no hacer nada, no reventar.
     */
    render(
      <div>
        <TituloPantalla>Itinerario</TituloPantalla>
      </div>,
    );
    expect(esCompacto()).toBe(false);
  });
});
