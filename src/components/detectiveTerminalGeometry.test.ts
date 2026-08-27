import { describe, expect, it } from "vitest";
import {
  TERMINAL_CUTOUT,
  simplifyTerminalTrace,
  terminalGlassPathData,
  terminalPathData,
  terminalPolygonPoints,
  validateTerminalCutout,
} from "./detectiveTerminalGeometry";

describe("detective terminal geometry", () => {
  it("keeps the checked-in cutout on the source canvas", () => {
    expect(TERMINAL_CUTOUT).toMatchObject({ width: 640, height: 427 });
    expect(TERMINAL_CUTOUT.points.length).toBeGreaterThan(8);
    expect(terminalPolygonPoints().split(" ")).toHaveLength(TERMINAL_CUTOUT.points.length);
    expect(terminalPathData()).toMatch(/^M\d+(?:\.\d+)? \d+(?:\.\d+)? C/);
  });

  it("keeps corner anchors as straight sections", () => {
    expect(terminalPathData([
      { x: 0, y: 0, smooth: false },
      { x: 10, y: 0, smooth: true },
      { x: 10, y: 10, smooth: true },
    ])).toContain("L10 0");
  });

  it("builds a continuous full-glass path behind foreground occluders", () => {
    const glass = terminalGlassPathData([
      { x: 10, y: 20 },
      { x: 50, y: 20 },
      { x: 50, y: 60 },
      { x: 10, y: 60 },
    ]);
    expect(glass).toMatch(/^M14 20 L46 20 C/);
    expect(glass).toMatch(/L10 24\.8 C10 26/);
    expect(glass).toMatch(/ Z$/);
  });

  it("rejects unsafe cutout coordinates", () => {
    expect(() => validateTerminalCutout({
      width: 640,
      height: 427,
      points: [{ x: 0, y: 0 }, { x: 700, y: 2 }, { x: 3, y: 3 }],
    })).toThrow(/in-bounds/);
  });

  it("simplifies a hand-drawn edge without losing its corner", () => {
    const simplified = simplifyTerminalTrace([
      { x: 10, y: 10 },
      { x: 11, y: 10.1 },
      { x: 12, y: 9.9 },
      { x: 30, y: 30 },
      { x: 31, y: 30.1 },
    ], 0.5);
    expect(simplified).toEqual([
      { x: 10, y: 10 },
      { x: 12, y: 9.9 },
      { x: 30, y: 30 },
      { x: 31, y: 30.1 },
    ]);
  });
});
