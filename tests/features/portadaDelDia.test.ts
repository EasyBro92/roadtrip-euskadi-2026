import { describe, expect, it } from "vitest";
import { fotoDelDia } from "../../src/features/itinerary/portadaDelDia";
import type { Stop } from "../../src/types";

function parada(nombre: string, categoria: string, minutos: number, foto?: string, extra: Partial<Stop> = {}): Stop {
  return {
    id: nombre,
    name: nombre,
    category: categoria,
    recommendedDurationMinutes: minutos,
    heroImage: foto,
    enabled: true,
    ...extra,
  } as Stop;
}

describe("fotoDelDia", () => {
  it("no coge el punto de partida sólo por ir primero", () => {
    /*
     * El caso real: el día 1 sale de Girona, que está en la lista porque de
     * ahí arranca la ruta, no porque se visite. El diario abría con la foto de
     * la ciudad de la que te vas.
     */
    const dia = [
      parada("Girona", "ciudad", 60, "girona.jpg"),
      parada("Huesca", "gastronomia", 90, "huesca.jpg"),
      parada("Castillo de Loarre", "castillo", 90, "loarre.jpg"),
    ];
    expect(fotoDelDia(dia)).toBe("huesca.jpg");
  });

  it("elige donde más rato se está", () => {
    const dia = [parada("Mirador", "mirador", 20, "mirador.jpg"), parada("Museo", "cultura", 180, "museo.jpg")];
    expect(fotoDelDia(dia)).toBe("museo.jpg");
  });

  it("una parada de cero minutos no compite", () => {
    // "Paso por aquí y ya": basta con dejarle el tiempo a cero.
    const dia = [parada("Casa", "ciudad", 0, "casa.jpg"), parada("Playa", "playa", 45, "playa.jpg")];
    expect(fotoDelDia(dia)).toBe("playa.jpg");
  });

  it("ni el hotel ni el aparcamiento representan el día", () => {
    // El hotel suele ser la parada más larga y ganaría siempre por tiempo.
    const dia = [parada("Hotel", "hotel", 600, "hotel.jpg"), parada("Gaztelugatxe", "paisaje", 120, "gaztelugatxe.jpg")];
    expect(fotoDelDia(dia)).toBe("gaztelugatxe.jpg");
  });

  it("pero si el día es sólo hotel, mejor su foto que ninguna", () => {
    expect(fotoDelDia([parada("Hotel", "hotel", 600, "hotel.jpg")])).toBe("hotel.jpg");
  });

  it("ignora las paradas desactivadas y las que no tienen foto", () => {
    const dia = [
      parada("Sin foto", "ciudad", 300),
      parada("Desactivada", "cultura", 200, "off.jpg", { enabled: false }),
      parada("Buena", "playa", 30, "buena.jpg"),
    ];
    expect(fotoDelDia(dia)).toBe("buena.jpg");
  });

  it("un día vacío no tiene portada", () => {
    expect(fotoDelDia([])).toBeUndefined();
  });
});
