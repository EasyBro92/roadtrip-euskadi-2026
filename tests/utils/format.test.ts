import { describe, expect, it } from "vitest";
import { clamp, fechaLocal, formatDuration, percentage } from "../../src/utils/format";

describe("clamp", () => {
  it("returns the value unchanged when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the minimum when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to the maximum when above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("percentage", () => {
  it("computes a rounded percentage", () => {
    expect(percentage(1, 3)).toBe(33);
  });

  it("returns 0 when total is 0", () => {
    expect(percentage(5, 0)).toBe(0);
  });

  it("returns 0 when total is negative", () => {
    expect(percentage(5, -10)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(percentage(150, 100)).toBe(100);
  });
});

describe("formatDuration", () => {
  it("formats minutes only when under an hour", () => {
    expect(formatDuration(25 * 60)).toBe("25 min");
  });

  it("formats whole hours without minutes", () => {
    expect(formatDuration(2 * 3600)).toBe("2 h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(2 * 3600 + 15 * 60)).toBe("2 h 15 min");
  });

  it("rounds seconds to the nearest minute", () => {
    expect(formatDuration(90)).toBe("2 min");
  });
});

describe("fechaLocal", () => {
  it("da el día que marca el reloj de aquí, no el de Londres", () => {
    /*
     * El caso que rompía: con toISOString(), una cena apuntada a las 00:30 de
     * un día de agosto en España se guardaba con la fecha del día anterior,
     * porque en UTC todavía no había cambiado el día.
     */
    expect(fechaLocal(new Date(2026, 7, 30, 0, 30))).toBe("2026-08-30");
  });

  it("rellena mes y día con cero", () => {
    expect(fechaLocal(new Date(2026, 0, 5, 14, 0))).toBe("2026-01-05");
  });

  it("aguanta el último instante del día", () => {
    expect(fechaLocal(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
  });
});
