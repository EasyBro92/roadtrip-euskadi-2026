import { create } from "zustand";
import type { Coordinates } from "../types";

export type PlaybackScope = "segment" | "day" | "trip";

interface VehicleAnimationState {
  isPlaying: boolean;
  /**
   * Modo "en ruta": la posición del coche viene del GPS real, no de la
   * animación. Excluyente con isPlaying — o simulas, o sigues tu posición.
   */
  isLive: boolean;
  position: Coordinates | null;
  bearing: number;
  speedMultiplier: number;
  scope: PlaybackScope;
  rafId: number | null;

  play: (scope?: PlaybackScope) => void;
  pause: () => void;
  setLive: (live: boolean) => void;
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
  isLive: false,
  position: null,
  bearing: 0,
  speedMultiplier: 1,
  scope: "segment",
  rafId: null,

  // Arrancar la simulación sale del modo en vivo, y viceversa: si no, la
  // animación y el GPS se pelearían por mover el mismo marcador.
  play: (scope = "segment") => set({ isPlaying: true, isLive: false, scope }),
  pause: () => set({ isPlaying: false }),
  setLive: (live) => set(live ? { isLive: true, isPlaying: false } : { isLive: false }),
  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),
  setPosition: (position, bearing) => set({ position, bearing }),
  setRafId: (id) => set({ rafId: id }),
  reset: () => set({ isPlaying: false, isLive: false, position: null, bearing: 0, rafId: null }),
}));
