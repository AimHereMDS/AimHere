import type { Coordinate, Hint, PanoramaView } from "../types/game";
import { apiFetch } from "../utils/api";

export async function requestHint(location: Coordinate, usedLevels: number, view?: PanoramaView | null) {
  return apiFetch<Hint>("/locations/hint", {
    method: "POST",
    body: JSON.stringify({ lat: location.lat, lng: location.lng, used_levels: usedLevels, view }),
  });
}
