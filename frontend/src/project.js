import { parse } from "./engine/parser";
export function serialise(data) {
    const lines = [];
    lines.push("---");
    lines.push("version: 1");
    lines.push(`viewport: "${data.viewport.xMin},${data.viewport.xMax},${data.viewport.yMin},${data.viewport.yMax}"`);
    lines.push("---");
    lines.push("");
    lines.push("# Expressions");
    lines.push("");
    for (const e of data.expressions) {
        lines.push(`## ${e.id}`);
        lines.push(`color: ${e.color}`);
        lines.push(`visible: ${e.visible}`);
        lines.push(`expr: ${e.raw}`);
        lines.push("");
    }
    if (data.sliders.length > 0) {
        lines.push("# Sliders");
        lines.push("");
        for (const s of data.sliders) {
            lines.push(`${s.name}: value=${s.value} min=${s.min} max=${s.max} step=${s.step}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
export function deserialise(text) {
    try {
        const lines = text.split("\n");
        let i = 0;
        if (lines[i++] !== "---")
            return null;
        let xMin = -10, xMax = 10, yMin = -7, yMax = 7;
        while (i < lines.length && lines[i] !== "---") {
            const line = lines[i++];
            const vpMatch = line.match(/^viewport:\s*"([^"]+)"/);
            if (vpMatch) {
                const [a, b, c, d] = vpMatch[1].split(",").map(Number);
                xMin = a;
                xMax = b;
                yMin = c;
                yMax = d;
            }
        }
        i++;
        const expressions = [];
        const sliders = [];
        let current = null;
        const flushExpr = () => {
            if (current?.id && current.raw !== undefined) {
                const parsed = parse(current.raw);
                expressions.push({
                    id: current.id,
                    raw: current.raw,
                    parsed,
                    visible: current.visible ?? true,
                    color: current.color ?? "#61acff",
                    error: parsed.type === "error" ? parsed.message : null,
                    showOutput: false,
                    isGlobal: false,
                });
            }
            current = null;
        };
        for (; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("## ")) {
                flushExpr();
                current = { id: line.slice(3).trim() };
                continue;
            }
            if (line.startsWith("# ")) {
                flushExpr();
                continue;
            }
            if (!line.trim())
                continue;
            if (current) {
                const colorM = line.match(/^color:\s*(.+)/);
                if (colorM) {
                    current.color = colorM[1].trim();
                    continue;
                }
                const visM = line.match(/^visible:\s*(.+)/);
                if (visM) {
                    current.visible = visM[1].trim() === "true";
                    continue;
                }
                const exprM = line.match(/^expr:\s*(.*)/);
                if (exprM) {
                    current.raw = exprM[1];
                    continue;
                }
            }
            else {
                const sliderM = line.match(/^(\w+):\s*value=([\d.e+-]+)\s+min=([\d.e+-]+)\s+max=([\d.e+-]+)\s+step=([\d.e+-]+)/);
                if (sliderM) {
                    sliders.push({
                        name: sliderM[1],
                        value: Number(sliderM[2]),
                        min: Number(sliderM[3]),
                        max: Number(sliderM[4]),
                        step: Number(sliderM[5]),
                    });
                }
            }
        }
        flushExpr();
        return { expressions, sliders, viewport: { xMin, xMax, yMin, yMax } };
    }
    catch {
        return null;
    }
}
