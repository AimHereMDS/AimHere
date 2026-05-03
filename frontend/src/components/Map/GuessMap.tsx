import { useEffect, useRef } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate } from "../../types/game";

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
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    let clickListener: google.maps.MapsEventListener | null = null;
    loadGoogleMaps().then(() => {
      if (!containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        clickableIcons: false,
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
    lineRef.current?.setMap(null);
    const points: Coordinate[] = [];
    if (guess) {
      markersRef.current.push(
        new google.maps.Marker({
          position: guess,
          map,
          label: "G",
          title: "Your guess",
        }),
      );
      points.push(guess);
    }
    if (real) {
      markersRef.current.push(
        new google.maps.Marker({
          position: real,
          map,
          label: "R",
          title: "Real location",
        }),
      );
      points.push(real);
    }
    if (aiGuess) {
      markersRef.current.push(
        new google.maps.Marker({
          position: aiGuess,
          map,
          label: "AI",
          title: "AI guess",
        }),
      );
      points.push(aiGuess);
    }
    if (guess && real) {
      lineRef.current = new google.maps.Polyline({
        path: [guess, real],
        strokeColor: "#ef4444",
        strokeWeight: 3,
        map,
      });
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

  return <div ref={containerRef} className="h-full min-h-[420px] w-full rounded-lg border border-slate-200 bg-slate-100" />;
}

