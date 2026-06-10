export interface HitResult {
  exprId: string;
  x: number;
  y: number;
  dist: number;
}

export function nearestPointOnCurves(
  mx: number,
  my: number,
  curves: Map<string, Float32Array>,
  toleranceMathUnits: number,
): HitResult | null {
  let best: HitResult | null = null;

  for (const [exprId, pts] of curves) {
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const px = pts[i], py = pts[i + 1];
      if (!isFinite(px) || !isFinite(py)) continue;

      if (i + 3 < pts.length) {
        const nx = pts[i + 2], ny = pts[i + 3];
        if (isFinite(nx) && isFinite(ny)) {
          const [sx, sy, sd] = nearestOnSegment(mx, my, px, py, nx, ny);
          if (sd < toleranceMathUnits && (!best || sd < best.dist)) {
            best = { exprId, x: sx, y: sy, dist: sd };
          }
          continue;
        }
      }

      const d = Math.hypot(px - mx, py - my);
      if (d < toleranceMathUnits && (!best || d < best.dist)) {
        best = { exprId, x: px, y: py, dist: d };
      }
    }
  }

  return best;
}

function nearestOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): [number, number, number] {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return [ax, ay, Math.hypot(px - ax, py - ay)];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx, cy = ay + t * dy;
  return [cx, cy, Math.hypot(px - cx, py - cy)];
}
