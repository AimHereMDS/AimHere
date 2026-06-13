import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate, PlayedRound } from "../../types/game";
import { darkMapStyles, markerIcon, pinIcon } from "../../utils/mapStyles";

type SummaryMapProps = {
  rounds: PlayedRound[];
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  fitPadding?: number;
  showRoundLabels?: boolean;
};

const DEFAULT_CLASS_NAME = "h-[520px] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-inset)]";

function aiCoordinate(round: PlayedRound): Coordinate | null {
  return round.result.ai_guess ? { lat: round.result.ai_guess.lat, lng: round.result.ai_guess.lng } : null;
}

export function SummaryMap({
  rounds,
  className = DEFAULT_CLASS_NAME,
  compact = false,
  interactive = true,
  fitPadding = compact ? 28 : 70,
  showRoundLabels = true,
}: SummaryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const [mapReadyToken, setMapReadyToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (!containerRef.current || cancelled || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: darkMapStyles,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: interactive && !compact,
        clickableIcons: false,
        disableDefaultUI: compact || !interactive,
        gestureHandling: interactive ? "greedy" : "none",
        keyboardShortcuts: interactive,
        minZoom: 2,
        restriction: { latLngBounds: { north: 85, south: -85, west: -180, east: 180 }, strictBounds: false },
      });
      mapRef.current = map;
      setMapReadyToken((value) => value + 1);
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      linesRef.current.forEach((line) => line.setMap(null));
      linesRef.current = [];
      mapRef.current = null;
    };
  }, [compact, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    linesRef.current.forEach((line) => line.setMap(null));
    linesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    const points: Coordinate[] = [];

    rounds.forEach((round) => {
      const realLabel = showRoundLabels ? String(round.index) : "R";
      markersRef.current.push(
        new google.maps.Marker({
          position: round.real,
          map,
          label: { text: realLabel, color: "#1b1208", fontSize: "11px", fontWeight: "900" },
          title: `Real location - round ${round.index}`,
          icon: markerIcon("#7fa86b", "#1b1208", 11),
        }),
      );
      markersRef.current.push(
        new google.maps.Marker({
          position: round.guess,
          map,
          title: `Your guess - round ${round.index}`,
          icon: pinIcon("#f3ead6", "#e0a94a", 1.05),
        }),
      );
      linesRef.current.push(
        new google.maps.Polyline({
          path: [round.guess, round.real],
          strokeColor: "#f3ead6",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
          map,
        }),
      );

      const aiGuess = aiCoordinate(round);
      if (aiGuess) {
        markersRef.current.push(
          new google.maps.Marker({
            position: aiGuess,
            map,
            label: { text: "AI", color: "#0a121b", fontSize: "10px", fontWeight: "900" },
            title: `AI guess - round ${round.index}`,
            icon: markerIcon("#8ba9c0", "#0a121b", 11),
          }),
        );
        linesRef.current.push(
          new google.maps.Polyline({
            path: [aiGuess, round.real],
            strokeColor: "#8ba9c0",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
            map,
          }),
        );
        bounds.extend(aiGuess);
        points.push(aiGuess);
      }

      bounds.extend(round.real);
      bounds.extend(round.guess);
      points.push(round.real, round.guess);
    });

    if (points.length > 1 && !bounds.isEmpty()) {
      map.fitBounds(bounds, fitPadding);
      window.setTimeout(() => map.fitBounds(bounds, fitPadding), 320);
    } else if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(compact ? 4 : 6);
    } else {
      map.setCenter({ lat: 20, lng: 0 });
      map.setZoom(2);
    }
  }, [compact, fitPadding, mapReadyToken, rounds, showRoundLabels]);

  return <div ref={containerRef} className={`${className} ${interactive ? "" : "pointer-events-none"}`} />;
}
