import cutout from "../assets/detective-terminal-cutout.json";

export interface TerminalPoint {
  x: number;
  y: number;
  smooth?: boolean;
}

export interface TerminalCutout {
  width: number;
  height: number;
  points: TerminalPoint[];
}

export const TERMINAL_WIDTH = 640;
export const TERMINAL_HEIGHT = 427;

function validPoint(point: TerminalPoint): boolean {
  return Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= 0
    && point.x <= TERMINAL_WIDTH
    && point.y >= 0
    && point.y <= TERMINAL_HEIGHT
    && (point.smooth === undefined || typeof point.smooth === "boolean");
}

export function validateTerminalCutout(value: TerminalCutout): TerminalCutout {
  if (value.width !== TERMINAL_WIDTH || value.height !== TERMINAL_HEIGHT) {
    throw new Error(`Terminal cutout must use a ${TERMINAL_WIDTH}x${TERMINAL_HEIGHT} canvas.`);
  }
  if (!Array.isArray(value.points) || value.points.length < 3 || value.points.length > 256 || !value.points.every(validPoint)) {
    throw new Error("Terminal cutout must contain 3 to 256 in-bounds points.");
  }
  return value;
}

export const TERMINAL_CUTOUT = validateTerminalCutout(cutout);
export const TERMINAL_CUTOUT_POINTS = TERMINAL_CUTOUT.points;

export function terminalPolygonPoints(points: readonly TerminalPoint[] = TERMINAL_CUTOUT_POINTS): string {
  return points.map(({ x, y }) => `${x},${y}`).join(" ");
}

function compact(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function terminalPathData(points: readonly TerminalPoint[] = TERMINAL_CUTOUT_POINTS, tension = 0.75): string {
  if (points.length < 3) return "";
  const segments = [`M${compact(points[0].x)} ${compact(points[0].y)}`];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const following = points[(index + 2) % points.length];
    if (start.smooth !== false && end.smooth !== false) {
      const firstControl = {
        x: start.x + (end.x - previous.x) * tension / 6,
        y: start.y + (end.y - previous.y) * tension / 6,
      };
      const secondControl = {
        x: end.x - (following.x - start.x) * tension / 6,
        y: end.y - (following.y - start.y) * tension / 6,
      };
      segments.push(`C${compact(firstControl.x)} ${compact(firstControl.y)} ${compact(secondControl.x)} ${compact(secondControl.y)} ${compact(end.x)} ${compact(end.y)}`);
    } else {
      segments.push(`L${compact(end.x)} ${compact(end.y)}`);
    }
  }
  return `${segments.join(" ")} Z`;
}

export function terminalGlassPathData(points: readonly TerminalPoint[] = TERMINAL_CUTOUT_POINTS): string {
  if (points.length < 3) return "";
  const left = Math.min(...points.map((point) => point.x));
  const right = Math.max(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  const horizontalRadius = Math.min(16, (right - left) * 0.1);
  const verticalRadius = Math.min(17, (bottom - top) * 0.12);
  return [
    `M${compact(left + horizontalRadius)} ${compact(top)}`,
    `L${compact(right - horizontalRadius)} ${compact(top)}`,
    `C${compact(right - 5)} ${compact(top)} ${compact(right)} ${compact(top + 6)} ${compact(right)} ${compact(top + verticalRadius)}`,
    `L${compact(right)} ${compact(bottom - verticalRadius)}`,
    `C${compact(right)} ${compact(bottom - 5)} ${compact(right - 6)} ${compact(bottom)} ${compact(right - horizontalRadius)} ${compact(bottom)}`,
    `L${compact(left + horizontalRadius)} ${compact(bottom)}`,
    `C${compact(left + 5)} ${compact(bottom)} ${compact(left)} ${compact(bottom - 6)} ${compact(left)} ${compact(bottom - verticalRadius)}`,
    `L${compact(left)} ${compact(top + verticalRadius)}`,
    `C${compact(left)} ${compact(top + 6)} ${compact(left + 5)} ${compact(top)} ${compact(left + horizontalRadius)} ${compact(top)}`,
    "Z",
  ].join(" ");
}

function perpendicularDistance(point: TerminalPoint, start: TerminalPoint, end: TerminalPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function simplifyTerminalTrace(points: readonly TerminalPoint[], tolerance = 1.35): TerminalPoint[] {
  if (points.length <= 2) return [...points];
  let furthestIndex = 0;
  let furthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points[points.length - 1]);
    if (distance > furthestDistance) {
      furthestIndex = index;
      furthestDistance = distance;
    }
  }
  if (furthestDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplifyTerminalTrace(points.slice(0, furthestIndex + 1), tolerance).slice(0, -1),
    ...simplifyTerminalTrace(points.slice(furthestIndex), tolerance),
  ];
}
