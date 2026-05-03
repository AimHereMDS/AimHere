import type { Coordinate, LocationMode } from "../types/game";
import { apiFetch } from "../utils/api";

export async function curateLocations(mode: LocationMode, filterText?: string, count = 5) {
  return apiFetch<{ locations: Coordinate[] }>("/locations", {
    method: "POST",
    body: JSON.stringify({ mode, filter_text: filterText, count }),
  });
}

