import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "../../hooks/useGoogleMaps";
import type { Coordinate, MovementMode, PanoramaView } from "../../types/game";

type Props = {
  location: Coordinate;
  movementMode: MovementMode;
  movementLimit: number;
  className?: string;
  onViewChange?: (view: PanoramaView) => void;
};

const POV_VIEW_EMIT_INTERVAL_MS = 100;

export function StreetViewPanorama({ location, movementMode, movementLimit, className, onViewChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const previousPanoRef = useRef<string | null>(null);
  const depthRef = useRef<Map<string, number>>(new Map());
  const onViewChangeRef = useRef<Props["onViewChange"]>(onViewChange);
  const [blocked, setBlocked] = useState(false);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    let cancelled = false;
    let listeners: google.maps.MapsEventListener[] = [];
    let initialEmitTimeout: number | null = null;
    let povEmitTimeout: number | null = null;
    let lastViewEmitAt: number | null = null;

    const clearInitialEmitTimeout = () => {
      if (initialEmitTimeout === null) return;
      window.clearTimeout(initialEmitTimeout);
      initialEmitTimeout = null;
    };

    const clearPovEmitTimeout = () => {
      if (povEmitTimeout === null) return;
      window.clearTimeout(povEmitTimeout);
      povEmitTimeout = null;
    };

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
      const emitView = () => {
        const position = panorama.getPosition();
        const pov = panorama.getPov();
        const zoom = panorama.getZoom();
        const fov = typeof zoom === "number" && Number.isFinite(zoom) ? Math.max(10, Math.min(120, 180 / 2 ** zoom)) : 90;
        if (!position || !pov) return false;
        onViewChangeRef.current?.({
          lat: position.lat(),
          lng: position.lng(),
          pano_id: panorama.getPano() || null,
          heading: pov.heading,
          pitch: pov.pitch,
          fov,
        });
        return true;
      };
      const emitViewImmediately = () => {
        clearPovEmitTimeout();
        if (emitView()) {
          lastViewEmitAt = window.performance.now();
        }
      };
      const emitThrottledPovView = () => {
        const now = window.performance.now();
        const elapsed = lastViewEmitAt === null ? POV_VIEW_EMIT_INTERVAL_MS : now - lastViewEmitAt;
        if (elapsed >= POV_VIEW_EMIT_INTERVAL_MS) {
          clearPovEmitTimeout();
          if (emitView()) {
            lastViewEmitAt = now;
          }
          return;
        }
        if (povEmitTimeout !== null) return;
        povEmitTimeout = window.setTimeout(() => {
          povEmitTimeout = null;
          if (cancelled) return;
          if (emitView()) {
            lastViewEmitAt = window.performance.now();
          }
        }, POV_VIEW_EMIT_INTERVAL_MS - elapsed);
      };
      listeners = [
        panorama.addListener("pano_changed", () => {
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
          emitViewImmediately();
        }),
        panorama.addListener("position_changed", emitViewImmediately),
        panorama.addListener("pov_changed", emitThrottledPovView),
      ];
      initialEmitTimeout = window.setTimeout(emitViewImmediately, 0);
    });

    return () => {
      cancelled = true;
      clearInitialEmitTimeout();
      clearPovEmitTimeout();
      listeners.forEach((listener) => listener.remove());
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
