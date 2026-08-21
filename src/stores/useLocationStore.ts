import { create } from "zustand";
import type { Coordinates } from "../types";
import { LocationService, LocationServiceError } from "../services/location/LocationService";

interface LocationStoreState {
  tracking: boolean;
  position: Coordinates | null;
  accuracyMeters: number | null;
  lastUpdatedAt: number | null;
  error: LocationServiceError | null;
  stopWatching: (() => void) | null;

  startTracking: (batterySaver?: boolean) => void;
  stopTracking: () => void;
  requestSinglePosition: () => Promise<Coordinates | null>;
}

export const useLocationStore = create<LocationStoreState>((set, get) => ({
  tracking: false,
  position: null,
  accuracyMeters: null,
  lastUpdatedAt: null,
  error: null,
  stopWatching: null,

  startTracking: (batterySaver = false) => {
    if (get().tracking) return;
    const stop = LocationService.watchPosition(
      (sample) => set({ position: sample.coordinates, accuracyMeters: sample.accuracyMeters, lastUpdatedAt: sample.timestamp, error: null }),
      (error) => set({ error }),
      batterySaver,
    );
    set({ tracking: true, stopWatching: stop, error: null });
  },

  stopTracking: () => {
    get().stopWatching?.();
    set({ tracking: false, stopWatching: null });
  },

  requestSinglePosition: async () => {
    try {
      const sample = await LocationService.getCurrentPosition();
      set({ position: sample.coordinates, accuracyMeters: sample.accuracyMeters, lastUpdatedAt: sample.timestamp, error: null });
      return sample.coordinates;
    } catch (error) {
      set({ error: error as LocationServiceError });
      return null;
    }
  },
}));
