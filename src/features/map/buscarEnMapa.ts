import type L from "leaflet";
import type { NearbyCategory } from "../../services/places/NearbyService";
import { useLugarStore } from "../../stores/useLugarStore";
import { useNearbyStore } from "../../stores/useNearbyStore";

/** Busca una categoría alrededor del centro del mapa. La usan los chips y el buscador. */
export function buscarCategoriaEnMapa(map: L.Map, categoria: NearbyCategory) {
  const c = map.getCenter();
  useLugarStore.getState().elegir(null);
  void useNearbyStore.getState().buscar({ latitude: c.lat, longitude: c.lng }, categoria);
}
