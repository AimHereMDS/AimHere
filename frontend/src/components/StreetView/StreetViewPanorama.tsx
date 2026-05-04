import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate, MovementMode } from "../../types/game";

type Props = {
  location: Coordinate;
  movementMode: MovementMode;
  movementLimit: number;
  className?: string;
};

export function StreetViewPanorama({ location, movementMode, movementLimit, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const previousPanoRef = useRef<string | null>(null);
  const depthRef = useRef<Map<string, number>>(new Map());
  const [blocked, setBlocked] = useState(false);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      depthRef.current = new Map();
      previousPanoRef.current = null;
      setBlocked(false);
      const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
        position: location,
        pov: { heading: Math.random() * 360, pitch: 0 },
        zoom: 1,
        addressControl: false,
        fullscreenControl: true,
        motionTracking: false,
        motionTrackingControl: false,
        panControl: true,
        zoomControl: true,
        linksControl: movementMode !== "rotation",
        clickToGo: movementMode !== "rotation",
        showRoadLabels: false,
      });
      panoramaRef.current = panorama;
      listener = panorama.addListener("pano_changed", () => {
        const current = panorama.getPano();
        if (!current) return;
        if (!depthRef.current.has(current)) {
          const previous = previousPanoRef.current;
          const previousDepth = previous ? depthRef.current.get(previous) ?? 0 : 0;
          depthRef.current.set(current, previous ? previousDepth + 1 : 0);
        }
        const nextDepth = depthRef.current.get(current) ?? 0;
        if (movementMode === "limited" && nextDepth > movementLimit && previousPanoRef.current) {
          setBlocked(true);
          panorama.setPano(previousPanoRef.current);
          return;
        }
        setBlocked(false);
        setDepth(nextDepth);
        previousPanoRef.current = current;
      });
    });

    return () => {
      cancelled = true;
      listener?.remove();
      panoramaRef.current = null;
    };
  }, [location.lat, location.lng, movementMode, movementLimit]);

  return (
    <div className={className ?? "relative h-full min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-slate-950"}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-3 top-3 rounded-md border border-white/10 bg-slate-950/75 px-3 py-2 text-sm font-semibold text-white shadow backdrop-blur">
        {movementMode === "rotation" && "Rotation only"}
        {movementMode === "limited" && `Limited movement: ${depth}/${movementLimit}`}
        {movementMode === "full" && "Full movement"}
      </div>
      {blocked && (
        <div className="absolute bottom-3 left-3 right-3 rounded-md border border-amber-300/40 bg-amber-400/90 px-3 py-2 text-sm font-black text-slate-950 shadow">
          Movement limit reached. The panorama was returned to the allowed route.
        </div>
      )}
    </div>
  );
}
