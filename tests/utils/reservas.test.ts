import { describe, expect, it } from "vitest";
import { diaSiguiente, urlBooking, urlSkyscanner } from "../../src/utils/reservas";

describe("urlBooking", () => {
  it("lleva la ciudad y las dos fechas", () => {
    const url = new URL(urlBooking("Bilbao", "2026-09-01", "2026-09-02"));

    expect(url.searchParams.get("ss")).toBe("Bilbao");
    expect(url.searchParams.get("checkin")).toBe("2026-09-01");
    expect(url.searchParams.get("checkout")).toBe("2026-09-02");
  });

  it("escapa los nombres con espacios y acentos", () => {
    const url = urlBooking("San Sebastián", "2026-09-01", "2026-09-02");
    expect(url).toContain("ss=San+Sebasti%C3%A1n");
  });

  it("nunca pide menos de un adulto", () => {
    const url = new URL(urlBooking("Bilbao", "2026-09-01", "2026-09-02", 0));
    expect(url.searchParams.get("group_adults")).toBe("1");
  });

  it("no añade identificador de afiliado mientras no haya ninguno", () => {
    // Si algún día se rellena, hay que avisar al usuario de que lo son.
    expect(urlBooking("Bilbao", "2026-09-01", "2026-09-02")).not.toContain("aid=");
  });
});

describe("urlSkyscanner", () => {
  it("lleva destino y fecha", () => {
    const url = new URL(urlSkyscanner("Lisboa", "2026-10-05"));
    expect(url.searchParams.get("search")).toBe("Lisboa");
    expect(url.searchParams.get("departure_date")).toBe("2026-10-05");
  });
});

describe("diaSiguiente", () => {
  it("avanza un día", () => {
    expect(diaSiguiente("2026-09-01")).toBe("2026-09-02");
  });

  it("cruza el final de mes", () => {
    expect(diaSiguiente("2026-08-31")).toBe("2026-09-01");
  });

  it("cruza el final de año", () => {
    expect(diaSiguiente("2026-12-31")).toBe("2027-01-01");
  });

  it("acierta en año bisiesto", () => {
    expect(diaSiguiente("2028-02-28")).toBe("2028-02-29");
  });
});
