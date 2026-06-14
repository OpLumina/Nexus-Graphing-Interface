export interface HitResult {
  exprId: string;
  x: number;
  y: number;
  dist: number;
}

// Hit distance is measured in *pixel* space (math deltas scaled by pixels-per-
// math-unit on each axis) rather than raw math units, so picking stays correct
// when the viewport is anisotropic (x and y scales differ). The returned point
// stays in math coordinates; only the comparison/tolerance is pixel-based.
export function nearestPointOnCurves(
  mx: number,
  my: number,
  curves: Map<string, Float32Array>,
  scaleX: number,
  scaleY: number,
  tolerancePx: number,
): HitResult | null {
  let best: HitResult | null = null;

  for (const [exprId, pts] of curves) {
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const px = pts[i], py = pts[i + 1];
      if (!isFinite(px) || !isFinite(py)) continue;

      if (i + 3 < pts.length) {
        const nx = pts[i + 2], ny = pts[i + 3];
        if (isFinite(nx) && isFinite(ny)) {
          const [sx, sy, sd] = nearestOnSegment(mx, my, px, py, nx, ny, scaleX, scaleY);
          if (sd < tolerancePx && (!best || sd < best.dist)) {
            best = { exprId, x: sx, y: sy, dist: sd };
          }
          continue;
        }
      }

      const d = Math.hypot((px - mx) * scaleX, (py - my) * scaleY);
      if (d < tolerancePx && (!best || d < best.dist)) {
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
  scaleX: number, scaleY: number,
): [number, number, number] {
  // Project in pixel space (so distance is on-screen distance), but recover the
  // closest point in math coords — the parameter t is identical in both spaces.
  const dx = (bx - ax) * scaleX, dy = (by - ay) * scaleY;
  const lenSq = dx * dx + dy * dy;
  const wx = (px - ax) * scaleX, wy = (py - ay) * scaleY;
  if (lenSq === 0) return [ax, ay, Math.hypot(wx, wy)];
  const t = Math.max(0, Math.min(1, (wx * dx + wy * dy) / lenSq));
  const cx = ax + t * (bx - ax), cy = ay + t * (by - ay);
  const distPx = Math.hypot(wx - t * dx, wy - t * dy);
  return [cx, cy, distPx];
}
