import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoutingService } from "../../src/services/routing/RoutingService";

const from = { latitude: 43.3183, longitude: -1.9812 };
const to = { latitude: 43.2627, longitude: -2.935 };

describe("RoutingService.routeBetweenStops", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    RoutingService.clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("falls back to a straight line, explicitly flagged, when every provider fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down (simulated)");
    }) as unknown as typeof fetch;

    const segment = await RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to });

    expect(segment.isFallback).toBe(true);
    expect(segment.provider).toBe("straight-line");
    expect(segment.geometry).toEqual([from, to]);
    expect(segment.distanceMeters).toBeGreaterThan(0);
  });

  it("never throws to the caller even if all network calls reject", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof fetch;

    await expect(RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to })).resolves.toBeDefined();
  });

  it("caches a successful segment so a second call does not hit the network again", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({ routes: [{ geometry: { coordinates: [[to.longitude, to.latitude], [from.longitude, from.latitude]] }, distance: 90000, duration: 3600 }] }),
      } as Response;
    }) as unknown as typeof fetch;

    const first = await RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to });
    expect(first.isFallback).toBe(false);
    const callsAfterFirst = callCount;

    await RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to });
    expect(callCount).toBe(callsAfterFirst);
  });

  it("keeps retrying providers (does not permanently cache a transient failure)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount += 1;
      throw new Error("simulated failure");
    }) as unknown as typeof fetch;

    await RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to });
    const callsAfterFirst = callCount;
    await RoutingService.routeBetweenStops({ fromStopId: "a", toStopId: "b", from, to });

    expect(callCount).toBeGreaterThan(callsAfterFirst);
  });
});
