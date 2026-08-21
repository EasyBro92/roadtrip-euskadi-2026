import { ACHIEVEMENT_DEFS } from "../../data/achievements.data";
import type { AchievementEvalContext, AchievementState } from "../../types";

/**
 * Evalúa todas las definiciones de logros contra el contexto actual del
 * viaje. Puro: no muta nada, el store decide cuándo llamarlo y qué hacer con
 * el resultado (persistir `unlockedAt` la primera vez que se desbloquea).
 */
export const AchievementService = {
  evaluate(ctx: AchievementEvalContext, previous: AchievementState[]): AchievementState[] {
    const previousById = new Map(previous.map((p) => [p.id, p]));

    return ACHIEVEMENT_DEFS.map((def) => {
      const unlocked = def.isUnlocked(ctx);
      const previousState = previousById.get(def.id);
      const wasUnlocked = Boolean(previousState?.unlockedAt);

      return {
        id: def.id,
        progress: def.getProgress(ctx),
        unlockedAt: unlocked ? (previousState?.unlockedAt ?? new Date().toISOString()) : wasUnlocked ? previousState!.unlockedAt : null,
      };
    });
  },

  newlyUnlockedIds(before: AchievementState[], after: AchievementState[]): string[] {
    const beforeUnlocked = new Set(before.filter((s) => s.unlockedAt).map((s) => s.id));
    return after.filter((s) => s.unlockedAt && !beforeUnlocked.has(s.id)).map((s) => s.id);
  },
};
