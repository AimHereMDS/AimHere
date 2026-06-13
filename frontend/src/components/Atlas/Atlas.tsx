import type { ReactNode } from "react";
import { useId } from "react";

export function AtlasLogo({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden="true" className="atlas-logo" height={size} viewBox="0 0 32 32" width={size}>
      <rect className="atlas-logo-frame" height="31" rx="7" width="31" x="0.5" y="0.5" />
      <circle className="atlas-logo-line" cx="16" cy="16" r="9.5" />
      <ellipse className="atlas-logo-line atlas-logo-line-soft" cx="16" cy="16" rx="9.5" ry="4" />
      <line className="atlas-logo-line atlas-logo-line-soft" x1="16" x2="16" y1="6.5" y2="25.5" />
      <path className="atlas-logo-needle" d="M16 10 14.5 16 16 22 17.5 16 16 10Z" />
      <circle className="atlas-logo-core" cx="16" cy="16" r="1.2" />
    </svg>
  );
}

export function CompassRose({ size = 92, heading, spin = false }: { size?: number; heading?: number | null; spin?: boolean }) {
  const ticks = Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    const r1 = index % 4 === 0 ? 38 : index % 2 === 0 ? 42 : 44;
    const r2 = 46;
    return (
      <line
        className={index % 8 === 0 ? "atlas-compass-tick atlas-compass-tick-major" : "atlas-compass-tick"}
        key={index}
        x1={50 + Math.cos(angle) * r1}
        x2={50 + Math.cos(angle) * r2}
        y1={50 + Math.sin(angle) * r1}
        y2={50 + Math.sin(angle) * r2}
      />
    );
  });

  return (
    <svg
      aria-hidden="true"
      className={spin ? "atlas-compass atlas-compass-spin" : "atlas-compass"}
      height={size}
      viewBox="0 0 100 100"
      width={size}
    >
      <circle className="atlas-compass-ring atlas-compass-ring-outer" cx="50" cy="50" r="46" />
      <circle className="atlas-compass-ring atlas-compass-ring-inner" cx="50" cy="50" r="38" />
      {ticks}
      <text className="atlas-compass-label atlas-compass-label-n" x="50" y="14">
        N
      </text>
      <text className="atlas-compass-label" x="50" y="92">
        S
      </text>
      <text className="atlas-compass-label" x="90" y="53">
        E
      </text>
      <text className="atlas-compass-label" x="10" y="53">
        W
      </text>
      <g transform={`rotate(${heading ?? 0} 50 50)`}>
        <polygon className="atlas-compass-needle atlas-compass-needle-n" points="50,18 47,52 53,52" />
        <polygon className="atlas-compass-needle atlas-compass-needle-s" points="50,82 47,52 53,52" />
        <circle className="atlas-compass-center" cx="50" cy="52" r="2.5" />
      </g>
    </svg>
  );
}

export function WorldBackdrop() {
  return (
    <div aria-hidden="true" className="world-bg">
      <svg className="world-bg-grid" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 1000">
        <defs>
          <pattern height="100" id="atlas-graticule" patternUnits="userSpaceOnUse" width="100" x="0" y="0">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <radialGradient cx="50%" cy="50%" id="atlas-graticule-fade" r="65%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="62%" stopColor="#000" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000" stopOpacity="1" />
          </radialGradient>
          <mask id="atlas-graticule-mask">
            <rect fill="white" height="100%" width="100%" />
            <rect fill="url(#atlas-graticule-fade)" height="100%" width="100%" />
          </mask>
        </defs>
        <rect fill="url(#atlas-graticule)" height="100%" mask="url(#atlas-graticule-mask)" width="100%" />
        {Array.from({ length: 6 }, (_, index) => (
          <ellipse
            className="world-bg-orbit"
            cx="78%"
            cy="82%"
            fill="none"
            key={index}
            rx={150 + index * 115}
            ry={(150 + index * 115) * 0.82}
            stroke="currentColor"
            strokeDasharray={index % 2 ? "2 7" : undefined}
          />
        ))}
      </svg>
    </div>
  );
}

const LANDMASS = [
  "M 130 110 Q 100 90 130 70 Q 200 50 240 90 Q 280 120 250 160 Q 240 200 220 220 Q 180 240 160 220 Q 130 200 130 170 Q 110 140 130 110 Z",
  "M 240 250 Q 250 230 270 240 Q 290 270 285 310 Q 280 360 260 380 Q 250 370 245 340 Q 235 300 240 250 Z",
  "M 470 90 Q 500 80 520 100 Q 540 120 530 145 Q 510 160 490 155 Q 470 145 470 120 Q 460 100 470 90 Z",
  "M 490 170 Q 520 160 545 180 Q 565 220 555 270 Q 540 320 510 330 Q 480 310 480 270 Q 475 220 490 170 Z",
  "M 555 90 Q 620 70 720 80 Q 800 100 820 130 Q 800 160 740 170 Q 660 175 600 165 Q 560 150 555 120 Q 545 100 555 90 Z",
  "M 660 175 Q 680 180 695 200 Q 700 230 685 250 Q 670 250 660 230 Q 655 200 660 175 Z",
  "M 770 290 Q 810 280 850 295 Q 870 320 845 340 Q 800 345 770 335 Q 755 315 770 290 Z",
  "M 100 420 Q 400 440 700 430 Q 850 425 900 440 L 900 470 L 100 470 Z",
];

type MapPin = {
  x: number;
  y: number;
  color?: string;
};

export function MiniWorldMap({
  pins = [],
  target,
  className = "",
}: {
  pins?: MapPin[];
  target?: MapPin;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const patternId = `${id}-dots`;
  const maskId = `${id}-land`;

  return (
    <svg aria-hidden="true" className={`mini-world ${className}`} viewBox="0 0 1000 500">
      <defs>
        <pattern height="6" id={patternId} patternUnits="userSpaceOnUse" width="6" x="0" y="0">
          <circle cx="3" cy="3" r="0.85" />
        </pattern>
        <mask id={maskId}>
          {LANDMASS.map((path, index) => (
            <path d={path} fill="white" key={index} />
          ))}
        </mask>
      </defs>
      <rect className="mini-world-ocean" fill={`url(#${patternId})`} height="500" width="1000" />
      <g mask={`url(#${maskId})`}>
        <rect className="mini-world-land" fill={`url(#${patternId})`} height="500" width="1000" />
      </g>
      {LANDMASS.map((path, index) => (
        <path className="mini-world-outline" d={path} fill="none" key={index} />
      ))}
      <line className="mini-world-equator" x1="0" x2="1000" y1="250" y2="250" />
      {pins.map((pin, index) => (
        <g key={index} transform={`translate(${pin.x},${pin.y})`}>
          <circle className="mini-world-pin-halo" r="8" style={{ color: pin.color }} />
          <circle className="mini-world-pin" r="3.4" style={{ color: pin.color }} />
        </g>
      ))}
      {target && (
        <g transform={`translate(${target.x},${target.y})`}>
          <circle className="mini-world-target-ring" r="10" style={{ color: target.color }} />
          <circle className="mini-world-target" r="3.4" style={{ color: target.color }} />
        </g>
      )}
      {pins[0] && target && (
        <line className="mini-world-link" x1={pins[0].x} x2={target.x} y1={pins[0].y} y2={target.y} />
      )}
    </svg>
  );
}

export function AtlasStat({
  value,
  label,
  hint,
  size = "md",
}: {
  value: ReactNode;
  label: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={`atlas-stat atlas-stat-${size}`}>
      <div className="serif tabular atlas-stat-value">{value}</div>
      <div className="eyebrow atlas-stat-label">{label}</div>
      {hint && <div className="atlas-stat-hint mono">{hint}</div>}
    </div>
  );
}

export function CoordStrip() {
  return (
    <div className="coord-strip">
      <span className="mono">N 51 28 40</span>
      <span className="dot">.</span>
      <span className="mono">W 000 00 05</span>
      <span className="sep" />
      <span className="mono">PRIME MERIDIAN</span>
      <span className="sep" />
      <span className="mono">BEARING 003</span>
    </div>
  );
}
