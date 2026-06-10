import { linkProgram } from "./canvas";
const VERT_SRC = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_pos;        // math coordinates
uniform vec4 u_viewport; // xMin, xMax, yMin, yMax

void main() {
  float cx = (a_pos.x - u_viewport.x) / (u_viewport.y - u_viewport.x) * 2.0 - 1.0;
  float cy = (a_pos.y - u_viewport.z) / (u_viewport.w - u_viewport.z) * 2.0 - 1.0;
  gl_Position = vec4(cx, cy, 0.0, 1.0);
}
`;
const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

uniform vec3 u_color;
uniform float u_alpha;
out vec4 fragColor;

void main() {
  fragColor = vec4(u_color, u_alpha);
}
`;
export class CurveRenderer {
    gl;
    program;
    vao;
    vbo;
    locPos;
    locViewport;
    locColor;
    locAlpha;
    constructor(gl) {
        this.gl = gl;
        this.program = linkProgram(gl, VERT_SRC, FRAG_SRC);
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.locPos = gl.getAttribLocation(this.program, "a_pos");
        this.locViewport = gl.getUniformLocation(this.program, "u_viewport");
        this.locColor = gl.getUniformLocation(this.program, "u_color");
        this.locAlpha = gl.getUniformLocation(this.program, "u_alpha");
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.enableVertexAttribArray(this.locPos);
        gl.vertexAttribPointer(this.locPos, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
    }
    drawCurve(points, viewport, style) {
        const { gl } = this;
        const { xMin, xMax, yMin, yMax } = viewport;
        gl.useProgram(this.program);
        gl.uniform4f(this.locViewport, xMin, xMax, yMin, yMax);
        gl.uniform3f(this.locColor, ...style.color);
        gl.uniform1f(this.locAlpha, style.alpha ?? 1.0);
        gl.lineWidth(style.lineWidth ?? 2.5);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        let segStart = 0;
        const n = points.length / 2;
        const flush = (from, to) => {
            if (to - from < 2)
                return;
            const segment = points.subarray(from * 2, to * 2);
            gl.bindVertexArray(this.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
            gl.bufferData(gl.ARRAY_BUFFER, segment, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.LINE_STRIP, 0, to - from);
            gl.bindVertexArray(null);
        };
        for (let i = 0; i < n; i++) {
            const x = points[i * 2];
            const y = points[i * 2 + 1];
            if (!isFinite(x) || !isFinite(y)) {
                flush(segStart, i);
                segStart = i + 1;
            }
        }
        flush(segStart, n);
    }
    dispose() {
        const { gl } = this;
        gl.deleteBuffer(this.vbo);
        gl.deleteVertexArray(this.vao);
        gl.deleteProgram(this.program);
    }
}
export const CURVE_COLORS = [
    [0.38, 0.68, 1.00],
    [1.00, 0.42, 0.42],
    [0.42, 0.88, 0.56],
    [1.00, 0.78, 0.22],
    [0.80, 0.45, 1.00],
    [0.22, 0.88, 0.88],
    [1.00, 0.55, 0.20],
    [1.00, 0.45, 0.78],
];
export function colorForIndex(i) {
    return CURVE_COLORS[i % CURVE_COLORS.length];
}
