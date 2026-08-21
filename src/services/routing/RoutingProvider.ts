import type { Coordinates, RouteStrategy, RoutingProviderId } from "../../types";

export interface RoutingProviderResult {
  geometry: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  hasTolls: boolean | null;
}

export interface RoutingProvider {
  id: RoutingProviderId;
  label: string;
  isAvailable(): boolean;
  requiresApiKey: boolean;
  route(waypoints: Coordinates[], strategy: RouteStrategy): Promise<RoutingProviderResult>;
}

export class RoutingProviderError extends Error {
  providerId: RoutingProviderId;

  constructor(providerId: RoutingProviderId, message: string) {
    super(message);
    this.name = "RoutingProviderError";
    this.providerId = providerId;
  }
}
