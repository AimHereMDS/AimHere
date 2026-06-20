import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate } from "../../types/game";
import { darkMapStyles, markerIcon, pinIcon } from "../../utils/mapStyles";
import { formatKm } from "../../utils/geo";

type Props = {
  guess: Coordinate | null;
  onGuess?: (coordinate: Coordinate) => void;
  real?: Coordinate;
  aiGuess?: Coordinate | null;
  locked?: boolean;
  distanceKm?: number | null;
};

export function GuessMap({ guess, onGuess, real, aiGuess, locked, distanceKm }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const lockedRef = useRef(false);
  const onGuessRef = useRef(onGuess);
  const [mapReadyToken, setMapReadyToken] = useState(0);

  useEffect(() => {
    lockedRef.current = Boolean(locked);
    onGuessRef.current = onGuess;
  }, [locked, onGuess]);

  useEffect(() => {
    let clickListener: google.maps.MapsEventListener | null = null;
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (!containerRef.current || cancelled || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: darkMapStyles,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        clickableIcons: false,
        minZoom: 2,
        gestureHandling: "greedy",
        restriction: { latLngBounds: { north: 85, south: -85, west: -180, east: 180 }, strictBounds: false },
      });
      mapRef.current = map;
      setMapReadyToken((value) => value + 1);
      clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (lockedRef.current || !event.latLng || !onGuessRef.current) return;
        onGuessRef.current({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
    });
    return () => {
      cancelled = true;
      clickListener?.remove();
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      linesRef.current.forEach((line) => line.setMap(null));
      linesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    linesRef.current.forEach((line) => line.setMap(null));
    linesRef.current = [];
    const points: Coordinate[] = [];
    if (guess) {
      markersRef.current.push(
        new google.maps.Marker({
          position: guess,
          map,
          title: "Your guess",
          icon: pinIcon("#f3ead6", "#e0a94a", 1.05),
        }),
      );
      points.push(guess);
    }
    if (real) {
      markersRef.current.push(
        new google.maps.Marker({
          position: real,
          map,
          title: "Real location",
          label: { text: "R", color: "#1b1208", fontSize: "11px", fontWeight: "900" },
          icon: markerIcon("#7fa86b", "#1b1208", 11),
        }),
      );
      points.push(real);
    }
    if (aiGuess) {
      markersRef.current.push(
        new google.maps.Marker({
          position: aiGuess,
          map,
          label: { text: "AI", color: "#0a121b", fontSize: "10px", fontWeight: "900" },
          title: "AI guess",
          icon: markerIcon("#8ba9c0", "#0a121b", 11),
        }),
      );
      points.push(aiGuess);
    }
    if (guess && real) {
      linesRef.current.push(new google.maps.Polyline({
        path: [guess, real],
        strokeColor: "#f3ead6",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        map,
      }));
    }
    if (aiGuess && real) {
      linesRef.current.push(new google.maps.Polyline({
        path: [aiGuess, real],
        strokeColor: "#8ba9c0",
        strokeOpacity: 0.85,
        strokeWeight: 2,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        map,
      }));
    }
    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 60);
      window.setTimeout(() => map.fitBounds(bounds, 60), 320);
    }
  }, [guess, real, aiGuess, mapReadyToken]);

  return (
    <div className="relative h-full w-full bg-[var(--bg-inset)]">
      <div ref={containerRef} className="h-full w-full" />
      {!guess && !locked && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[rgba(15,25,35,0.86)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] backdrop-blur">
          Click to place your guess
        </div>
      )}
      {guess && real && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md border border-[var(--line)] bg-[rgba(15,25,35,0.92)] px-3 py-2 text-xs text-[var(--ink)] shadow-lg backdrop-blur">
          <div className="eyebrow text-[var(--accent)]">Round result</div>
          {typeof distanceKm === "number" && <div className="mono mt-1 text-[var(--ink)]">Distance: {formatKm(distanceKm)}</div>}
        </div>
      )}
    </div>
  );
}
