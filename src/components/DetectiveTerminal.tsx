"use client";

import { useId, type CSSProperties } from "react";
import detectiveTerminal from "../assets/detective-terminal.webp?url";
import type { DetectiveMood } from "../ai/protocol";
import { TERMINAL_CUTOUT_POINTS, terminalGlassPathData, terminalPathData, type TerminalPoint } from "./detectiveTerminalGeometry";

export const DETECTIVE_FACES: Record<DetectiveMood, string> = {
  idle: "._.",
  curious: "o_O?",
  thinking: "...",
  discovery: "O_O!",
  pleased: "^_^",
  warning: "!_!",
  error: "x_x",
};

export const DETECTIVE_TERMINAL_CALIBRATION = Object.freeze({
  pitch: -5,
  yaw: -7.15,
  roll: -1.25,
  yawSkewFactor: 0.35,
  scanlineCurve: 4,
  crtBulge: 0.72,
});

const SCANLINE_ROWS = Array.from({ length: 30 }, (_, index) => 102 + index * 5.7);

interface DetectiveTerminalProps {
  mood: DetectiveMood;
  face?: string;
  thinking?: boolean;
  showBusy?: boolean;
  showGlass?: boolean;
  showScanlines?: boolean;
  faceRotate?: number;
  faceSkew?: number;
  scanlineCurve?: number;
  crtBulge?: number;
  cutoutPoints?: readonly TerminalPoint[];
  screenPitch?: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function DetectiveTerminal({
  mood,
  face,
  thinking = false,
  showBusy = true,
  showGlass = true,
  showScanlines = true,
  faceRotate = DETECTIVE_TERMINAL_CALIBRATION.roll,
  faceSkew = DETECTIVE_TERMINAL_CALIBRATION.yaw * DETECTIVE_TERMINAL_CALIBRATION.yawSkewFactor,
  scanlineCurve = DETECTIVE_TERMINAL_CALIBRATION.scanlineCurve,
  crtBulge = DETECTIVE_TERMINAL_CALIBRATION.crtBulge,
  cutoutPoints = TERMINAL_CUTOUT_POINTS,
  screenPitch = DETECTIVE_TERMINAL_CALIBRATION.pitch,
  paused = false,
  className = "",
  style,
}: DetectiveTerminalProps) {
  const prefix = useId().replace(/:/g, "");
  const apertureShapeId = `${prefix}-screen-aperture`;
  const glassShapeId = `${prefix}-full-glass`;
  const glassClipId = `${prefix}-glass-clip`;
  const fillId = `${prefix}-screen-fill`;
  const sheenId = `${prefix}-glass-sheen`;
  const bulgeId = `${prefix}-screen-bulge`;
  const textureId = `${prefix}-screen-texture`;
  const shellMaskId = `${prefix}-shell-mask`;
  const glassMaskId = `${prefix}-glass-mask`;
  const glassFeatherId = `${prefix}-glass-feather`;
  const glowId = `${prefix}-phosphor-glow`;
  const validPoints = cutoutPoints.length >= 3 ? cutoutPoints : TERMINAL_CUTOUT_POINTS;
  const aperturePath = terminalPathData(validPoints);
  const glassPath = terminalGlassPathData(validPoints);
  const verticalScale = Math.max(0.72, 1 - Math.abs(screenPitch) * 0.0045);
  const contentTransform = `translate(309 184) rotate(${faceRotate}) skewX(${faceSkew}) scale(1 ${verticalScale}) translate(-309 -184)`;
  const boundedBulge = Math.max(0, Math.min(1, crtBulge));

  return (
    <div className={`terminal-character ${className}`.trim()} data-mood={mood} data-paused={paused || undefined} style={style}>
      <svg className="terminal-art" viewBox="0 0 640 427" role="img" aria-label="Vintage robot detective terminal with a fedora">
        <defs>
          <path id={apertureShapeId} d={aperturePath} />
          <path id={glassShapeId} d={glassPath} />
          <clipPath id={glassClipId}><use href={`#${glassShapeId}`} /></clipPath>
          <mask id={shellMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="427">
            <rect width="640" height="427" fill="white" />
            <use href={`#${apertureShapeId}`} fill="black" />
          </mask>
          <mask id={glassMaskId} maskUnits="userSpaceOnUse" x="190" y="95" width="230" height="180">
            <rect x="190" y="95" width="230" height="180" fill="black" />
            <use href={`#${glassShapeId}`} fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" filter={`url(#${glassFeatherId})`} />
          </mask>
          <radialGradient id={fillId} cx="48%" cy="43%" r="68%">
            <stop offset="0" stopColor="#123d25" />
            <stop offset=".62" stopColor="#082719" />
            <stop offset="1" stopColor="#03120d" />
          </radialGradient>
          <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9fff0" stopOpacity=".18" />
            <stop offset=".3" stopColor="#8dddb7" stopOpacity=".025" />
            <stop offset=".72" stopColor="#020806" stopOpacity=".16" />
            <stop offset="1" stopColor="#d9aa6e" stopOpacity=".09" />
          </linearGradient>
          <radialGradient id={bulgeId} cx="48%" cy="43%" r="65%">
            <stop offset="0" stopColor="#baffd4" stopOpacity=".035" />
            <stop offset=".62" stopColor="#06110b" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".76" />
          </radialGradient>
          <pattern id={textureId} width="19" height="17" patternUnits="userSpaceOnUse" patternTransform="rotate(-2)">
            <circle cx="3" cy="5" r=".7" fill="#bbffd0" opacity=".24" />
            <circle cx="14" cy="11" r=".45" fill="#d9f3b7" opacity=".19" />
            <path d="M7 15 l4 -1" stroke="#8bc294" strokeWidth=".45" opacity=".18" />
            <path d="M16 2 l1.6 .5" stroke="#dce8ad" strokeWidth=".35" opacity=".14" />
          </pattern>
          <filter id={glassFeatherId} filterUnits="userSpaceOnUse" x="188" y="93" width="234" height="184">
            <feGaussianBlur stdDeviation=".65" />
          </filter>
          <filter id={glowId} x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <use href={`#${glassShapeId}`} fill={`url(#${fillId})`} />
        <g clipPath={`url(#${glassClipId})`} mask={`url(#${glassMaskId})`}>
          <g transform={contentTransform}>
            <rect className="terminal-screen-texture" x="190" y="95" width="230" height="180" fill={`url(#${textureId})`} />
            {showScanlines ? (
              <g className="terminal-screen-scanlines" aria-hidden="true">
                {SCANLINE_ROWS.map((y) => (
                  <path key={y} d={`M194 ${y + 2.4} Q309 ${y + scanlineCurve} 416 ${y - 2.4}`} />
                ))}
              </g>
            ) : null}
            <g>
              <text className="terminal-screen-glyph" x="309" y="204" textAnchor="middle" filter={`url(#${glowId})`} aria-hidden="true">{face ?? DETECTIVE_FACES[mood]}</text>
            </g>
          </g>
        </g>
        <use className="terminal-screen-bulge" href={`#${glassShapeId}`} fill={`url(#${bulgeId})`} opacity={boundedBulge} />
        {showGlass ? <use className="terminal-screen-glass" href={`#${glassShapeId}`} fill={`url(#${sheenId})`} /> : null}
        <image href={detectiveTerminal} width="640" height="427" mask={`url(#${shellMaskId})`} />
      </svg>
      {showBusy ? <span className={`terminal-busy ${thinking ? "thinking" : ""}`} /> : null}
    </div>
  );
}
