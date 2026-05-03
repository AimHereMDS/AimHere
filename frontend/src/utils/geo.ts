import type { Coordinate } from "../types/game";

export function formatKm(value: number) {
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

export function totalScore(scores: Array<{ result: { score: number } }>) {
  return scores.reduce((sum, round) => sum + round.result.score, 0);
}

export function mapBounds(points: Coordinate[]): google.maps.LatLngBounds {
  const bounds = new google.maps.LatLngBounds();
  points.forEach((point) => bounds.extend(point));
  return bounds;
}

