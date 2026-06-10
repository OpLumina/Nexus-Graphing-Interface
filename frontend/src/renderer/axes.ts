import { ViewportState, viewportWidth, viewportHeight } from "./viewport";

export interface AxesOptions {
  gridColor?: string;
  axisColor?: string;
  labelColor?: string;
  fontSize?: number;
}

const DEFAULTS: Required<AxesOptions> = {
  gridColor: "rgba(255,255,255,0.07)",
  axisColor: "rgba(255,255,255,0.4)",
  labelColor: "rgba(255,255,255,0.5)",
  fontSize: 11,
};

function niceStep(range: number, pixels: number, minPxPerTick = 60): number {
  const approx = (range / pixels) * minPxPerTick;
  const mag = Math.pow(10, Math.floor(Math.log10(approx)));
  for (const factor of [1, 2, 5, 10]) {
    if (mag * factor >= approx) return mag * factor;
  }
  return mag * 10;
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  opts: AxesOptions = {},
): void {
  const { gridColor, axisColor, labelColor, fontSize } = { ...DEFAULTS, ...opts };
  const { width: W, height: H } = ctx.canvas;
  const { xMin, xMax, yMin, yMax } = viewport;
  const mathW = viewportWidth(viewport);
  const mathH = viewportHeight(viewport);

  ctx.clearRect(0, 0, W, H);
  ctx.font = `${fontSize}px monospace`;

  const toPixX = (mx: number) => ((mx - xMin) / mathW) * W;
  const toPixY = (my: number) => ((yMax - my) / mathH) * H;

  const step = Math.min(niceStep(mathW, W), niceStep(mathH, H));

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  const startX = Math.ceil(xMin / step) * step;
  for (let x = startX; x <= xMax + step * 0.001; x += step) {
    const px = toPixX(x);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }

  const startY = Math.ceil(yMin / step) * step;
  for (let y = startY; y <= yMax + step * 0.001; y += step) {
    const py = toPixY(y);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  }

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1.5;

  const ox = toPixX(0);
  const oy = toPixY(0);

  if (ox >= 0 && ox <= W) {
    ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
  }
  if (oy >= 0 && oy <= H) {
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
  }

  ctx.fillStyle = labelColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelY = Math.min(Math.max(oy + 4, 4), H - fontSize - 4);

  for (let x = startX; x <= xMax + step * 0.001; x += step) {
    if (Math.abs(x) < step * 0.01) continue;
    const px = toPixX(x);
    const label = Number(x.toPrecision(6)).toString();
    ctx.fillText(label, px, labelY);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const labelX = Math.min(Math.max(ox + 4, 4), W - 40);

  for (let y = startY; y <= yMax + step * 0.001; y += step) {
    if (Math.abs(y) < step * 0.01) continue;
    const py = toPixY(y);
    const label = Number(y.toPrecision(6)).toString();
    ctx.fillText(label, labelX, py);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (ox >= 0 && ox <= W && oy >= 0 && oy <= H) {
    ctx.fillText("0", ox + 4, oy + 4);
  }
}
