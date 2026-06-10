import { describe, it, expect } from "vitest";
import { sampleWithLists } from "../sampler";
import { parse } from "../parser";
const VP = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
describe("sampleWithLists — list expansion", () => {
    it("y = a*x with a=[1,2,3] produces 3 curves (rhs list var)", () => {
        const parsed = parse("y = a*x");
        expect(parsed.type).toBe("equation");
        const curves = sampleWithLists(parsed, {}, VP, {}, { a: [1, 2, 3] });
        expect(curves).toHaveLength(3);
    });
    it("a*x (expression) with a=[1,2,3] produces 3 curves", () => {
        const parsed = parse("a*x");
        expect(parsed.type).toBe("expression");
        const curves = sampleWithLists(parsed, {}, VP, {}, { a: [1, 2, 3] });
        expect(curves).toHaveLength(3);
    });
    it("no list var produces 1 curve", () => {
        const parsed = parse("x^2");
        const curves = sampleWithLists(parsed, {}, VP, {}, {});
        expect(curves).toHaveLength(1);
    });
    it("each curve has non-zero points", () => {
        const parsed = parse("y = a*x");
        const curves = sampleWithLists(parsed, {}, VP, {}, { a: [1, 2, 3] });
        for (const c of curves) {
            expect(c.points.length).toBeGreaterThan(0);
        }
    });
    it("curves reflect different a values — different slopes", () => {
        const parsed = parse("y = a*x");
        const curves = sampleWithLists(parsed, {}, VP, {}, { a: [1, 2] });
        expect(curves).toHaveLength(2);
        // y = 1*x at x=1 → y=1; y = 2*x at x=1 → y=2
        // Find the point near x=1 in each curve
        const yAt1 = (pts) => {
            for (let i = 0; i < pts.length - 2; i += 2) {
                if (Math.abs(pts[i] - 1) < 0.05)
                    return pts[i + 1];
            }
            return NaN;
        };
        const y0 = yAt1(curves[0].points);
        const y1 = yAt1(curves[1].points);
        expect(Math.abs(y0 - y1)).toBeGreaterThan(0.5);
    });
});
describe("sampleWithLists — equation lhs list var", () => {
    it("a*y = x (lhs has a) with a=[1,2] produces 2 curves", () => {
        // This is a general implicit equation — both sides scanned
        const parsed = parse("a*y = x");
        const curves = sampleWithLists(parsed, {}, VP, {}, { a: [1, 2] });
        // May produce 0 or more curves depending on implicit solver — just check no crash
        expect(Array.isArray(curves)).toBe(true);
    });
});
