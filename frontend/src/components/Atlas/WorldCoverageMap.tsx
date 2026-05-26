import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent, type WheelEvent } from "react";

import { WORLD_COUNTRIES, type WorldCountry } from "../../data/worldCountries";
import type { CoveragePoint } from "../../types/game";

type Point = Pick<CoveragePoint, "lat" | "lng"> & Partial<CoveragePoint>;

export type EnrichedCoveragePoint = Point & {
  country?: WorldCountry;
  country_name?: string;
  continent?: string;
};

type CountryPath = {
  country: WorldCountry;
  path: string;
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.5;

const CONTINENT_LABELS = [
  { label: "North America", x: 200, y: 150 },
  { label: "South America", x: 310, y: 330 },
  { label: "Europe", x: 510, y: 135 },
  { label: "Africa", x: 535, y: 265 },
  { label: "Asia", x: 690, y: 175 },
  { label: "Oceania", x: 805, y: 355 },
];

export const SAMPLE_COVERAGE_POINTS: Point[] = [
  { lat: 40.7128, lng: -74.006, label: "New York" },
  { lat: 48.8566, lng: 2.3522, label: "Paris" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney" },
  { lat: -22.9068, lng: -43.1729, label: "Rio de Janeiro" },
];

const COUNTRY_PATHS: CountryPath[] = WORLD_COUNTRIES.map((country) => ({
  country,
  path: country.polygons.map((polygon) => polygon.map(ringToPath).join(" ")).join(" "),
}));
const countryLookupCache = new Map<string, WorldCountry | undefined>();

function project(lng: number, lat: number) {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

function ringToPath(ring: number[][]) {
  return ring
    .map(([lng, lat], index) => {
      const { x, y } = project(lng, lat);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ")
    .concat(" Z");
}

function isInsideBBox(country: WorldCountry, lat: number, lng: number) {
  const [west, south, east, north] = country.bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

function pointInRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [lngA, latA] = ring[index];
    const [lngB, latB] = ring[previous];
    const crosses = latA > lat !== latB > lat;
    if (!crosses) continue;
    const intersectionLng = ((lngB - lngA) * (lat - latA)) / (latB - latA) + lngA;
    if (lng < intersectionLng) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, polygon: number[][][]) {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lng, lat, hole));
}

export function findCountryForCoordinate(lat: number, lng: number) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (countryLookupCache.has(cacheKey)) return countryLookupCache.get(cacheKey);
  const country = WORLD_COUNTRIES.find((candidate) => (
    isInsideBBox(candidate, lat, lng)
    && candidate.polygons.some((polygon) => pointInPolygon(lng, lat, polygon))
  ));
  countryLookupCache.set(cacheKey, country);
  return country;
}

export function getCoverageSummary(points: Point[]) {
  const enrichedPoints = points.map((point) => {
    const country = findCountryForCoordinate(point.lat, point.lng);
    return {
      ...point,
      country,
      country_name: country?.name,
      continent: country?.continent,
    };
  });
  const countryMap = new Map<string, WorldCountry>();
  const continents = new Set<string>();
  enrichedPoints.forEach((point) => {
    if (point.country) {
      countryMap.set(point.country.id, point.country);
      continents.add(point.country.continent);
    }
  });
  return {
    enrichedPoints,
    countries: Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    continents: Array.from(continents).sort(),
  };
}

export function WorldCoverageMap({
  points,
  className = "",
  showLabels = true,
  interactive = true,
}: {
  points: Point[];
  className?: string;
  showLabels?: boolean;
  interactive?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [hoveredCountry, setHoveredCountry] = useState<WorldCountry | null>(null);
  const [drag, setDrag] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const summary = useMemo(() => getCoverageSummary(points), [points]);
  const visitedCountries = useMemo(
    () => new Set(summary.countries.map((country) => country.id)),
    [summary.countries],
  );
  const zoomed = zoom > MIN_ZOOM;
  const viewportTransform = `translate(${MAP_WIDTH / 2 + offset.x} ${MAP_HEIGHT / 2 + offset.y}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`;

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  function clampOffset(nextOffset: { x: number; y: number }, nextZoom = zoom) {
    const maxX = (MAP_WIDTH * (nextZoom - 1)) / 2;
    const maxY = (MAP_HEIGHT * (nextZoom - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextOffset.x)),
      y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
    };
  }

  function setZoomLevel(nextZoom: number) {
    if (!interactive) return;
    const boundedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom.toFixed(2))));
    setZoom(boundedZoom);
    setOffset((currentOffset) => (boundedZoom === MIN_ZOOM ? { x: 0, y: 0 } : clampOffset(currentOffset, boundedZoom)));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!interactive) return;
    event.preventDefault();
    setZoomLevel(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!interactive || !zoomed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / bounds.width) * MAP_WIDTH;
    const dy = ((event.clientY - drag.startY) / bounds.height) * MAP_HEIGHT;
    setOffset(clampOffset({ x: drag.originX + dx, y: drag.originY + dy }));
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (drag?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDrag(null);
    }
  }

  function selectCountry(country: WorldCountry) {
    setHoveredCountry(country);
  }

  function handleCountryKeyDown(event: ReactKeyboardEvent<SVGPathElement>, country: WorldCountry) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectCountry(country);
  }

  return (
    <div
      className={`world-coverage-map-shell ${zoomed ? "is-zoomed" : ""} ${drag ? "is-dragging" : ""} ${fullscreen ? "is-fullscreen" : ""} ${className}`}
      onWheel={handleWheel}
    >
      <svg
        aria-label="World coverage map with country borders and played locations"
        className="world-coverage-map"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="img"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      >
        <defs>
          <pattern height="28" id="world-coverage-grid" patternUnits="userSpaceOnUse" width="28">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.55" />
          </pattern>
        </defs>
        <rect className="world-coverage-ocean" height={MAP_HEIGHT} width={MAP_WIDTH} />
        <g className="world-coverage-viewport" transform={viewportTransform}>
          <rect className="world-coverage-grid" fill="url(#world-coverage-grid)" height={MAP_HEIGHT} width={MAP_WIDTH} />
          {[-120, -60, 0, 60, 120].map((lng) => {
            const { x } = project(lng, 0);
            return <line className="world-coverage-meridian" key={lng} x1={x} x2={x} y1="0" y2={MAP_HEIGHT} />;
          })}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const { y } = project(0, lat);
            return <line className="world-coverage-parallel" key={lat} x1="0" x2={MAP_WIDTH} y1={y} y2={y} />;
          })}
          <g className="world-coverage-countries">
            {COUNTRY_PATHS.map(({ country, path }) => (
              <path
                className={visitedCountries.has(country.id) ? "world-coverage-country is-visited" : "world-coverage-country"}
                d={path}
                key={country.id}
                aria-label={`${country.name}, ${country.continent}`}
                onBlur={() => setHoveredCountry(null)}
                onClick={() => selectCountry(country)}
                onFocus={() => selectCountry(country)}
                onKeyDown={(event) => handleCountryKeyDown(event, country)}
                onPointerEnter={() => selectCountry(country)}
                onPointerLeave={() => setHoveredCountry(null)}
                role="button"
                tabIndex={0}
              >
                <title>{country.name}</title>
              </path>
            ))}
          </g>
          {showLabels && (
            <g className="world-coverage-labels">
              {CONTINENT_LABELS.map((item) => (
                <text key={item.label} x={item.x} y={item.y}>
                  {item.label}
                </text>
              ))}
            </g>
          )}
          {showPins && (
            <g className="world-coverage-pins">
              {summary.enrichedPoints.map((point, index) => {
                const { x, y } = project(point.lng, point.lat);
                return (
                  <g key={`${point.lat}-${point.lng}-${index}`} transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}>
                    <circle className="world-coverage-pin-halo" r="10" />
                    <circle className="world-coverage-pin-ring" r="5.5" />
                    <circle className="world-coverage-pin" r="2.8" />
                    <title>{point.country_name || point.label || "Played location"}</title>
                  </g>
                );
              })}
            </g>
          )}
        </g>
      </svg>
      <div className="world-coverage-country-readout">
        <span>Country</span>
        <strong>{hoveredCountry?.name ?? "None selected"}</strong>
        {hoveredCountry && <em>{hoveredCountry.continent}</em>}
      </div>
      {interactive && (
        <div aria-label="Map zoom controls" className="world-coverage-controls" role="group">
          <button aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoomLevel(zoom - ZOOM_STEP)} title="Zoom out" type="button">
            <Minus size={15} />
          </button>
          <button aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoomLevel(zoom + ZOOM_STEP)} title="Zoom in" type="button">
            <Plus size={15} />
          </button>
          <button aria-label="Reset map" disabled={!zoomed} onClick={() => setZoomLevel(MIN_ZOOM)} title="Reset map" type="button">
            <RotateCcw size={14} />
          </button>
          <button
            aria-label={showPins ? "Hide pins" : "Show pins"}
            aria-pressed={!showPins}
            onClick={() => setShowPins((current) => !current)}
            title={showPins ? "Hide pins" : "Show pins"}
            type="button"
          >
            {showPins ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen map"}
            aria-pressed={fullscreen}
            onClick={() => setFullscreen((current) => !current)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen map"}
            type="button"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}
      {interactive && (
        <div className="world-coverage-zoom-readout">
          {zoom.toFixed(1)}x
        </div>
      )}
    </div>
  );
}
