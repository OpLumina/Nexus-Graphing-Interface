export function defaultViewport() {
    return { xMin: -10, xMax: 10, yMin: -7, yMax: 7 };
}
export function viewportWidth(v) {
    return v.xMax - v.xMin;
}
export function viewportHeight(v) {
    return v.yMax - v.yMin;
}
export function pixelToMath(px, py, v, canvasW, canvasH) {
    const x = v.xMin + (px / canvasW) * viewportWidth(v);
    const y = v.yMax - (py / canvasH) * viewportHeight(v);
    return [x, y];
}
export function mathToClip(mx, my, v) {
    const cx = ((mx - v.xMin) / viewportWidth(v)) * 2 - 1;
    const cy = ((my - v.yMin) / viewportHeight(v)) * 2 - 1;
    return [cx, cy];
}
export function pan(v, dx, dy) {
    return {
        xMin: v.xMin - dx,
        xMax: v.xMax - dx,
        yMin: v.yMin - dy,
        yMax: v.yMax - dy,
    };
}
export function panByPixels(v, dpx, dpy, canvasW, canvasH) {
    const dx = (dpx / canvasW) * viewportWidth(v);
    const dy = (dpy / canvasH) * viewportHeight(v);
    return pan(v, dx, -dy);
}
export function zoomAt(v, mx, my, factor) {
    return {
        xMin: mx + (v.xMin - mx) * factor,
        xMax: mx + (v.xMax - mx) * factor,
        yMin: my + (v.yMin - my) * factor,
        yMax: my + (v.yMax - my) * factor,
    };
}
export function zoomAtPixel(v, px, py, factor, canvasW, canvasH) {
    const [mx, my] = pixelToMath(px, py, v, canvasW, canvasH);
    return zoomAt(v, mx, my, factor);
}
export function fitAspect(v, canvasW, canvasH) {
    const mathW = viewportWidth(v);
    const mathH = (canvasH / canvasW) * mathW;
    const cy = (v.yMin + v.yMax) / 2;
    return { ...v, yMin: cy - mathH / 2, yMax: cy + mathH / 2 };
}
