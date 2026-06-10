export function nearestPointOnCurves(mx, my, curves, toleranceMathUnits) {
    let best = null;
    for (const [exprId, pts] of curves) {
        for (let i = 0; i + 1 < pts.length; i += 2) {
            const px = pts[i], py = pts[i + 1];
            if (!isFinite(px) || !isFinite(py))
                continue;
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
function nearestOnSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0)
        return [ax, ay, Math.hypot(px - ax, py - ay)];
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx, cy = ay + t * dy;
    return [cx, cy, Math.hypot(px - cx, py - cy)];
}
