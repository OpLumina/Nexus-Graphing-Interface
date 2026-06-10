import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "../store";
import { initGL, resizeToDisplaySize } from "../renderer/canvas";
import { CurveRenderer, colorForIndex } from "../renderer/curves";
import { drawAxes } from "../renderer/axes";
import { sampleWithLists } from "../engine/sampler";
import { evaluate } from "../engine/evaluator";
import { panByPixels, zoomAtPixel, pixelToMath, fitAspect } from "../renderer/viewport";
import { sampleLine, hexToRgb } from "../renderer/overlays";
import { nearestPointOnCurves } from "../renderer/hittest";
import type { OverlayLine } from "../renderer/overlays";

interface InspectPoint {
  screenX: number;
  screenY: number;
  mathX: number;
  mathY: number;
  color: string;
}

export function GraphCanvas() {
  const glCanvasRef   = useRef<HTMLCanvasElement>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<CurveRenderer | null>(null);
  const isDragging      = useRef(false);
  const lastPos         = useRef<[number, number]>([0, 0]);
  const mouseDownPos    = useRef<[number, number]>([0, 0]);
  const reflectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sampledCachRef = useRef<Map<string, Float32Array>>(new Map());

  const [inspectPoint, setInspectPoint] = useState<InspectPoint | null>(null);

  const viewport    = useStore(s => s.viewport);
  const setViewport = useStore(s => s.setViewport);
  const expressions = useStore(s => s.expressions);
  const sliders     = useStore(s => s.sliders);
  const toolResults = useStore(s => s.toolResults);

  useEffect(() => { setInspectPoint(null); }, [viewport]);

  useEffect(() => {
    const reflectExprs = expressions.filter(e => e.visible && e.parsed.type === "reflect");
    if (reflectExprs.length === 0) return;
    clearTimeout(reflectTimerRef.current);
    reflectTimerRef.current = setTimeout(() => {
      const store = useStore.getState();
      for (const expr of reflectExprs) {
        void store.runTool("reflect", {}, expr.id);
      }
    }, 300);
    return () => clearTimeout(reflectTimerRef.current);
  }, [expressions, viewport]);

  useEffect(() => {
    const canvas = glCanvasRef.current!;
    const { gl } = initGL(canvas);
    rendererRef.current = new CurveRenderer(gl);
    return () => { rendererRef.current?.dispose(); };
  }, []);

  useEffect(() => {
    const container = containerRef.current!;
    const fit = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        setViewport(fitAspect(useStore.getState().viewport, w, h));
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const glCanvas   = glCanvasRef.current!;
    const axisCanvas = axisCanvasRef.current!;
    const renderer   = rendererRef.current;
    if (!renderer) return;

    const gl = glCanvas.getContext("webgl2")!;
    resizeToDisplaySize(glCanvas, gl);
    axisCanvas.width  = glCanvas.width;
    axisCanvas.height = glCanvas.height;

    const ctx2d = axisCanvas.getContext("2d")!;
    drawAxes(ctx2d, viewport);

    {
      const store2   = useStore.getState();
      const env2     = store2.getEnv();
      const userFns2 = store2.getUserFns();
      const W = axisCanvas.width, H = axisCanvas.height;
      const xRange = viewport.xMax - viewport.xMin;
      const yRange = viewport.yMax - viewport.yMin;
      const COLS = 60, ROWS = 60;
      const cw = W / COLS, ch = H / ROWS;

      for (const expr of expressions) {
        if (!expr.visible || expr.parsed.type !== "inequality") continue;
        const { lhs, op, rhs } = expr.parsed;
        const hex = expr.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ctx2d.fillStyle = `rgba(${r},${g},${b},0.15)`;
        ctx2d.beginPath();
        for (let ci2 = 0; ci2 < COLS; ci2++) {
          const mx = viewport.xMin + ((ci2 + 0.5) / COLS) * xRange;
          for (let ri = 0; ri < ROWS; ri++) {
            const my = viewport.yMax - ((ri + 0.5) / ROWS) * yRange;
            const lv = evaluate(lhs, { ...env2, x: mx, y: my }, userFns2);
            const rv = evaluate(rhs, { ...env2, x: mx, y: my }, userFns2);
            const holds =
              op === "<"  ? lv < rv  :
              op === ">"  ? lv > rv  :
              op === "<=" ? lv <= rv :
                            lv >= rv;
            if (holds) ctx2d.rect(ci2 * cw, ri * ch, cw, ch);
          }
        }
        ctx2d.fill();
      }
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    const store            = useStore.getState();
    const env              = store.getEnv();
    const userFns          = store.getUserFns();
    const listAssignments  = store.getListAssignments();

    const newCache = new Map<string, Float32Array>();
    const ALPHAS = [1.0, 0.72, 0.5, 0.35, 0.25];

    let colorIndex = 0;
    for (const expr of expressions) {
      if (!expr.visible) { colorIndex++; continue; }

      const curves = sampleWithLists(expr.parsed, env, viewport, userFns, listAssignments);
      const [r, g, b] = colorForIndex(colorIndex);

      curves.forEach((curve, ci) => {
        const alpha = ALPHAS[Math.min(ci, ALPHAS.length - 1)];
        renderer.drawCurve(curve.points, viewport, { color: [r, g, b], lineWidth: 2.5, alpha });
        if (ci === 0) newCache.set(expr.id, curve.points);
      });

      colorIndex++;
    }

    sampledCachRef.current = newCache;

    const allOverlays: OverlayLine[] = Object.values(toolResults)
      .flatMap(r => r.overlays ?? []);

    for (const overlay of allOverlays) {
      if (!isFinite(overlay.slope) || !isFinite(overlay.y0)) continue;
      const pts = sampleLine(overlay.x0, overlay.y0, overlay.slope, viewport);
      const [r, g, b] = hexToRgb(overlay.color);
      renderer.drawCurve(pts, viewport, { color: [r, g, b], lineWidth: 1.5 });
    }
  }, [viewport, expressions, sliders, toolResults]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = [e.clientX, e.clientY];
    mouseDownPos.current = [e.clientX, e.clientY];
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const [lx, ly] = lastPos.current;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lastPos.current = [e.clientX, e.clientY];
    const canvas = glCanvasRef.current!;
    setViewport(panByPixels(viewport, dx, dy, canvas.clientWidth, canvas.clientHeight));
  }, [viewport, setViewport]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    isDragging.current = false;
    const [dx, dy] = [e.clientX - mouseDownPos.current[0], e.clientY - mouseDownPos.current[1]];
    if (Math.hypot(dx, dy) >= 5) return;

    const canvas = glCanvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const [mx, my] = pixelToMath(px, py, viewport, canvas.clientWidth, canvas.clientHeight);

    const tol = (viewport.xMax - viewport.xMin) * 0.02;
    const hit = nearestPointOnCurves(mx, my, sampledCachRef.current, tol);
    if (hit) {
      const expr = useStore.getState().expressions.find(ex => ex.id === hit.exprId);
      setInspectPoint({
        screenX: px,
        screenY: py,
        mathX: hit.x,
        mathY: hit.y,
        color: expr?.color ?? "#e8e8e8",
      });
    } else {
      setInspectPoint(null);
    }
  }, [viewport]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = glCanvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewport(zoomAtPixel(viewport, e.clientX - rect.left, e.clientY - rect.top, factor, canvas.clientWidth, canvas.clientHeight));
  }, [viewport, setViewport]);

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <canvas
        ref={glCanvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}    onMouseLeave={() => { isDragging.current = false; }}
        onWheel={onWheel}
      />
      <canvas
        ref={axisCanvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
      {inspectPoint && (
        <div
          style={{
            position: "absolute",
            left: inspectPoint.screenX + 14,
            top:  inspectPoint.screenY - 10,
            background: "rgba(18,18,24,0.92)",
            border: `1px solid ${inspectPoint.color}66`,
            borderRadius: 6,
            padding: "5px 10px",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#e8e8e8",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ color: inspectPoint.color, marginRight: 6 }}>●</span>
          <span style={{ color: "#aaa" }}>x</span>
          {" = "}
          <span style={{ color: "#e8e8e8" }}>{inspectPoint.mathX.toFixed(3)}</span>
          {"  "}
          <span style={{ color: "#aaa" }}>y</span>
          {" = "}
          <span style={{ color: "#e8e8e8" }}>{inspectPoint.mathY.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}
