import { useEffect, useRef } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate } from "../../types/game";
import { darkMapStyles, markerIcon } from "../../utils/mapStyles";

type Props = {
  guess: Coordinate | null;
  onGuess?: (coordinate: Coordinate) => void;
  real?: Coordinate;
  aiGuess?: Coordinate | null;
  locked?: boolean;
};

export function GuessMap({ guess, onGuess, real, aiGuess, locked }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    let clickListener: google.maps.MapsEventListener | null = null;
    loadGoogleMaps().then(() => {
      if (!containerRef.current) return;
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
      clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (locked || !event.latLng || !onGuess) return;
        onGuess({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
    });
    return () => {
      clickListener?.remove();
    };
  }, [locked, onGuess]);

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
          icon: markerIcon("#f8fafc", "#14b8a6", 9),
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
          label: { text: "R", color: "#020617", fontSize: "11px", fontWeight: "900" },
          icon: markerIcon("#2dd4bf", "#020617", 11),
        }),
      );
      points.push(real);
    }
    if (aiGuess) {
      markersRef.current.push(
        new google.maps.Marker({
          position: aiGuess,
          map,
          label: { text: "AI", color: "#020617", fontSize: "10px", fontWeight: "900" },
          title: "AI guess",
          icon: markerIcon("#fbbf24", "#020617", 11),
        }),
      );
      points.push(aiGuess);
    }
    if (guess && real) {
      linesRef.current.push(new google.maps.Polyline({
        path: [guess, real],
        strokeColor: "#f8fafc",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        map,
      }));
    }
    if (aiGuess && real) {
      linesRef.current.push(new google.maps.Polyline({
        path: [aiGuess, real],
        strokeColor: "#fbbf24",
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
    } else if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(5);
    }
  }, [guess, real, aiGuess]);

  return (
    <div className="relative h-full w-full bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />
      {!guess && !locked && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          Click to place your guess
        </div>
      )}
    </div>
  );
}

