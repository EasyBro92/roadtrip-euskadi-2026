import { describe, expect, it } from "vitest";
import { categoriaDeTipoOsm, categoriaEscrita, lugarDeCercano, partirDireccion } from "./categoriaDeLugar";

describe("categoriaEscrita", () => {
  it("reconoce categorías con o sin tildes, plural y 'cerca'", () => {
    expect(categoriaEscrita("Gasolinera")).toBe("gasolinera");
    expect(categoriaEscrita("gasolineras cerca")).toBe("gasolinera");
    expect(categoriaEscrita("cafetería")).toBe("restaurante");
    expect(categoriaEscrita("dormir")).toBe("hotel");
    expect(categoriaEscrita("  Farmacia ")).toBe("farmacia");
  });

  it("no confunde un sitio con una categoría", () => {
    expect(categoriaEscrita("Hotel Pedro I de Aragón")).toBeNull();
    expect(categoriaEscrita("Bilbao")).toBeNull();
    expect(categoriaEscrita("")).toBeNull();
  });
});

describe("categoriaDeTipoOsm", () => {
  it("traduce los tipos de OpenStreetMap a categorías de parada", () => {
    expect(categoriaDeTipoOsm("castle")).toBe("castillo");
    expect(categoriaDeTipoOsm("village")).toBe("pueblo");
    expect(categoriaDeTipoOsm("restaurant")).toBe("gastronomia");
    expect(categoriaDeTipoOsm("beach")).toBe("playa");
  });

  it("lo desconocido entra como cultura, ya no como pueblo", () => {
    expect(categoriaDeTipoOsm("loquesea")).toBe("cultura");
    expect(categoriaDeTipoOsm(undefined)).toBe("cultura");
  });
});

describe("partirDireccion", () => {
  it("separa el nombre del resto y recorta la dirección", () => {
    expect(partirDireccion("Castillo de Butrón, Gatika, Bizkaia, España, 48110")).toEqual({ nombre: "Castillo de Butrón", resto: "Gatika, Bizkaia, España" });
    expect(partirDireccion("Bilbao")).toEqual({ nombre: "Bilbao", resto: "" });
  });
});

describe("lugarDeCercano", () => {
  it("lleva la cocina y el precio como chips y elige la categoría de parada", () => {
    const lugar = lugarDeCercano({
      id: "7",
      name: "Cal Ros",
      category: "restaurante",
      coordinates: { latitude: 41.98, longitude: 2.82 },
      distanceMeters: 300,
      isReal: true,
      clase: "Restaurante",
      cocina: "regional",
      precio: "€€",
    });
    expect(lugar.categoria).toBe("gastronomia");
    expect(lugar.chips).toEqual(["Restaurante", "regional", "€€"]);
    expect(lugar.id).toBe("cerca:7");
  });
});
