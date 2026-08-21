import { create } from "zustand";
import type { Coordinates } from "../types";

export type PlaybackScope = "segment" | "day" | "trip";

interface VehicleAnimationState {
  isPlaying: boolean;
  position: Coordinates | null;
  bearing: number;
  speedMultiplier: number;
  scope: PlaybackScope;
  rafId: number | null;

  play: (scope?: PlaybackScope) => void;
  pause: () => void;
  setSpeed: (multiplier: number) => void;
  setPosition: (position: Coordinates, bearing: number) => void;
  setRafId: (id: number | null) => void;
  reset: () => void;
}

/**
 * Estado de la animación del coche, deliberadamente separado de useTripStore:
 * cambia en cada frame (requestAnimationFrame) y no debe persistirse ni
 * disparar escrituras en localStorage en cada tick.
 */
export const useVehicleAnimationStore = create<VehicleAnimationState>((set) => ({
  isPlaying: false,
  position: null,
  bearing: 0,
  speedMultiplier: 1,
  scope: "segment",
  rafId: null,

  play: (scope = "segment") => set({ isPlaying: true, scope }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),
  setPosition: (position, bearing) => set({ position, bearing }),
  setRafId: (id) => set({ rafId: id }),
  reset: () => set({ isPlaying: false, position: null, bearing: 0, rafId: null }),
}));
