import { describe, expect, it } from "vitest";
import { SEED_STOPS } from "../../src/data/stops.data";
import { SEED_TRIP } from "../../src/data/trip.data";
import { AchievementService } from "../../src/services/achievements/AchievementService";
import type { AchievementEvalContext } from "../../src/types";

function baseContext(overrides: Partial<AchievementEvalContext> = {}): AchievementEvalContext {
  return {
    trip: SEED_TRIP,
    stops: SEED_STOPS,
    totalPhotos: 0,
    totalKm: 0,
    totalDistinctStadiumsVisited: 0,
    totalRefuels: 0,
    ...overrides,
  };
}

describe("AchievementService.evaluate", () => {
  it("keeps everything locked when nothing has happened yet", () => {
    const result = AchievementService.evaluate(baseContext(), []);
    expect(result.every((r) => r.unlockedAt === null)).toBe(true);
  });

  it("unlocks the 500km achievement once totalKm reaches the threshold", () => {
    const result = AchievementService.evaluate(baseContext({ totalKm: 500 }), []);
    const achievement = result.find((r) => r.id === "ach-500km");
    expect(achievement?.unlockedAt).not.toBeNull();
  });

  it("does not unlock 1000km when only at 500km", () => {
    const result = AchievementService.evaluate(baseContext({ totalKm: 500 }), []);
    const achievement = result.find((r) => r.id === "ach-1000km");
    expect(achievement?.unlockedAt).toBeNull();
  });

  it("preserves the original unlock timestamp on re-evaluation", () => {
    const first = AchievementService.evaluate(baseContext({ totalKm: 500 }), []);
    const firstTimestamp = first.find((r) => r.id === "ach-500km")?.unlockedAt;

    const second = AchievementService.evaluate(baseContext({ totalKm: 800 }), first);
    const secondTimestamp = second.find((r) => r.id === "ach-500km")?.unlockedAt;

    expect(secondTimestamp).toBe(firstTimestamp);
  });
});

describe("AchievementService.newlyUnlockedIds", () => {
  it("detects achievements that transitioned from locked to unlocked", () => {
    const before = AchievementService.evaluate(baseContext({ totalKm: 0 }), []);
    const after = AchievementService.evaluate(baseContext({ totalKm: 500 }), before);
    expect(AchievementService.newlyUnlockedIds(before, after)).toContain("ach-500km");
  });

  it("returns an empty array when nothing new unlocked", () => {
    const state = AchievementService.evaluate(baseContext({ totalKm: 500 }), []);
    expect(AchievementService.newlyUnlockedIds(state, state)).toHaveLength(0);
  });
});
