import { useEffect, useRef } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { PlayedRound } from "../../types/game";

export function SummaryMap({ rounds }: { rounds: PlayedRound[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        streetViewControl: false,
        mapTypeControl: false,
      });
      const bounds = new google.maps.LatLngBounds();
      rounds.forEach((round) => {
        new google.maps.Marker({ position: round.real, map, label: `${round.index}R`, title: "Real location" });
        new google.maps.Marker({ position: round.guess, map, label: `${round.index}G`, title: "Your guess" });
        new google.maps.Polyline({
          path: [round.guess, round.real],
          strokeColor: "#0f766e",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map,
        });
        bounds.extend(round.real);
        bounds.extend(round.guess);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 70);
    });
  }, [rounds]);

  return <div ref={containerRef} className="h-[520px] rounded-lg border border-slate-200 bg-slate-100" />;
}

