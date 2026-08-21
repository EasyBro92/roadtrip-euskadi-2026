import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, BedDouble, Camera, Fish, Fuel, Gauge, Landmark, MapPin, Mountain, PartyPopper, Trophy, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ACHIEVEMENT_DEFS } from "../data/achievements.data";
import { db } from "../services/storage/db";
import { useTripStore } from "../stores/useTripStore";
import { percentage } from "../utils/format";

const ICONS: Record<string, LucideIcon> = { MapPin, Trophy, BedDouble, Fuel, UtensilsCrossed, Fish, Camera, Gauge, Waves, Landmark, Mountain, PartyPopper };

export function AchievementsPage() {
  const navigate = useNavigate();
  const achievementsState = useTripStore((s) => s.achievementsState);
  const syncAchievements = useTripStore((s) => s.syncAchievements);
  const totalPhotos = useLiveQuery(() => db.photos.count(), []) ?? 0;

  useEffect(() => {
    syncAchievements(totalPhotos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPhotos]);

  const unlockedCount = achievementsState.filter((a) => a.unlockedAt).length;

  return (
    <div className="safe-x h-full overflow-y-auto bg-(--color-bg) px-4 pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-(--color-text-muted)">
        <ArrowLeft size={15} aria-hidden="true" /> Atrás
      </button>
      <h1 className="text-xl font-bold">Logros</h1>

      {/* Cabecera con el progreso global, para dar sensación de avance. */}
      <div className="mb-5 mt-3 rounded-(--radius-card) border bg-(--color-surface) p-4 shadow-(--shadow-card)" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-medium">
            {unlockedCount}
            <span className="text-base text-(--color-text-muted)">/{ACHIEVEMENT_DEFS.length}</span>
          </span>
          <span className="text-xs text-(--color-text-muted)">{percentage(unlockedCount, ACHIEVEMENT_DEFS.length)}% desbloqueado</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--color-surface-muted)">
          <div className="h-full rounded-full bg-(--color-gastronomy) transition-all" style={{ width: `${percentage(unlockedCount, ACHIEVEMENT_DEFS.length)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENT_DEFS.map((def) => {
          const state = achievementsState.find((a) => a.id === def.id);
          const unlocked = Boolean(state?.unlockedAt);
          const IconComponent = ICONS[def.icon] ?? Trophy;
          const progressPct = def.targetValue ? percentage(state?.progress ?? 0, def.targetValue) : unlocked ? 100 : 0;

          return (
            <div
              key={def.id}
              className="flex flex-col items-center gap-1.5 rounded-(--radius-card) border bg-(--color-surface) p-3 text-center shadow-(--shadow-card)"
              style={{
                borderColor: unlocked ? "var(--color-gastronomy)" : "var(--color-border)",
                background: unlocked ? "color-mix(in srgb, var(--color-gastronomy) 7%, var(--color-surface))" : undefined,
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: unlocked ? "var(--color-gastronomy)" : "var(--color-surface-muted)" }}
              >
                <IconComponent size={21} color={unlocked ? "white" : "var(--color-text-muted)"} aria-hidden="true" />
              </div>
              <p className={`text-xs font-medium ${unlocked ? "text-(--color-text)" : "text-(--color-text-muted)"}`}>{def.name}</p>
              <p className="text-[10px] leading-snug text-(--color-text-muted)">{def.description}</p>
              {unlocked ? (
                <p className="text-[10px] font-medium text-(--color-gastronomy)">
                  {state?.unlockedAt ? `Conseguido el ${new Date(state.unlockedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : "Conseguido"}
                </p>
              ) : (
                def.targetValue && (
                  <div className="mt-0.5 w-full">
                    <div className="h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)">
                      <div className="h-full rounded-full bg-(--color-navigation)" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-(--color-text-muted)">
                      {state?.progress ?? 0}/{def.targetValue}
                    </p>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
