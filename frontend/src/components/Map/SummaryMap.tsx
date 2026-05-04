import { useEffect, useRef } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { PlayedRound } from "../../types/game";
import { darkMapStyles, markerIcon } from "../../utils/mapStyles";

export function SummaryMap({ rounds }: { rounds: PlayedRound[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: darkMapStyles,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      });
      const bounds = new google.maps.LatLngBounds();
      rounds.forEach((round) => {
        new google.maps.Marker({
          position: round.real,
          map,
          label: { text: String(round.index), color: "#020617", fontSize: "11px", fontWeight: "900" },
          title: "Real location",
          icon: markerIcon("#2dd4bf", "#020617", 11),
        });
        new google.maps.Marker({
          position: round.guess,
          map,
          title: "Your guess",
          icon: markerIcon("#f8fafc", "#14b8a6", 9),
        });
        new google.maps.Polyline({
          path: [round.guess, round.real],
          strokeColor: "#f8fafc",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
          map,
        });
        if (round.result.ai_guess) {
          const aiGuess = { lat: round.result.ai_guess.lat, lng: round.result.ai_guess.lng };
          new google.maps.Marker({
            position: aiGuess,
            map,
            label: { text: "AI", color: "#020617", fontSize: "10px", fontWeight: "900" },
            title: "AI guess",
            icon: markerIcon("#fbbf24", "#020617", 11),
          });
          new google.maps.Polyline({
            path: [aiGuess, round.real],
            strokeColor: "#fbbf24",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
            map,
          });
          bounds.extend(aiGuess);
        }
        bounds.extend(round.real);
        bounds.extend(round.guess);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 70);
    });
  }, [rounds]);

  return <div ref={containerRef} className="h-[520px] overflow-hidden rounded-lg border border-white/10 bg-slate-950" />;
}

