import { describe, expect, it } from "vitest";
import { bearingDegrees, haversineDistanceMeters, interpolateCoordinates, pointAlongPath, totalPathDistanceMeters } from "../../src/utils/geo";

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical coordinates", () => {
    const point = { latitude: 43.3183, longitude: -1.9812 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it("computes a realistic straight-line distance between San Sebastián and Bilbao (~70-90km)", () => {
    // Distancia en línea recta (haversine), no por carretera: ~77km es correcto,
    // la carretera real (A-8) son ~100km.
    const sanSebastian = { latitude: 43.3183, longitude: -1.9812 };
    const bilbao = { latitude: 43.2627, longitude: -2.935 };
    const distanceKm = haversineDistanceMeters(sanSebastian, bilbao) / 1000;
    expect(distanceKm).toBeGreaterThan(70);
    expect(distanceKm).toBeLessThan(90);
  });
});

describe("bearingDegrees", () => {
  it("returns ~0 when heading due north", () => {
    const from = { latitude: 43.0, longitude: -2.0 };
    const to = { latitude: 44.0, longitude: -2.0 };
    expect(bearingDegrees(from, to)).toBeCloseTo(0, 0);
  });

  it("returns ~90 when heading due east", () => {
    const from = { latitude: 43.0, longitude: -2.0 };
    const to = { latitude: 43.0, longitude: -1.0 };
    expect(bearingDegrees(from, to)).toBeCloseTo(90, 0);
  });
});

describe("interpolateCoordinates", () => {
  it("returns the start point at t=0 and end point at t=1", () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 10, longitude: 10 };
    expect(interpolateCoordinates(a, b, 0)).toEqual(a);
    expect(interpolateCoordinates(a, b, 1)).toEqual(b);
  });

  it("clamps t outside [0,1]", () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 10, longitude: 10 };
    expect(interpolateCoordinates(a, b, -5)).toEqual(a);
    expect(interpolateCoordinates(a, b, 5)).toEqual(b);
  });
});

describe("pointAlongPath", () => {
  const path = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 0, longitude: 2 },
  ];

  it("starts at the first point when progress is 0", () => {
    expect(pointAlongPath(path, 0).point).toEqual(path[0]);
  });

  it("ends at the last point when progress is 1", () => {
    const result = pointAlongPath(path, 1);
    expect(result.point.longitude).toBeCloseTo(2, 5);
  });

  it("lands roughly at the midpoint segment for progress 0.5", () => {
    const result = pointAlongPath(path, 0.5);
    expect(result.point.longitude).toBeCloseTo(1, 1);
  });
});

describe("totalPathDistanceMeters", () => {
  it("sums consecutive segment distances", () => {
    const path = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 0, longitude: 2 },
    ];
    const total = totalPathDistanceMeters(path);
    const half = totalPathDistanceMeters([path[0], path[1]]);
    expect(total).toBeCloseTo(half * 2, -2);
  });
});
