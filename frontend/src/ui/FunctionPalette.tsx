import { useState } from "react";

interface PaletteButton {
  label: string;
  title?: string;
  insert: string;
  cursor?: number;
}

const GROUPS: { label: string; buttons: PaletteButton[] }[] = [
  {
    label: "Vars",
    buttons: [
      { label: "x",  insert: "x" },
      { label: "y",  insert: "y" },
      { label: "t",  insert: "t" },
      { label: "θ",  insert: "θ" },
      { label: "π",  insert: "π" },
      { label: "e",  insert: "e" },
      { label: "x_", title: "subscript variable", insert: "_" },
    ],
  },
  {
    label: "Ops",
    buttons: [
      { label: "x²",  title: "square",            insert: "^2" },
      { label: "xⁿ",  title: "power",             insert: "^",            cursor: 1 },
      { label: "√",   title: "square root",        insert: "sqrt()",       cursor: 5 },
      { label: "∛",   title: "cube root",          insert: "cbrt()",       cursor: 5 },
      { label: "ⁿ√",  title: "nth root — nthroot(x, n)", insert: "nthroot(,)", cursor: 8 },
      { label: "| |", title: "absolute value",     insert: "abs()",        cursor: 4 },
      { label: "1/",  title: "reciprocal",         insert: "1/()",         cursor: 3 },
      { label: "mod", title: "modulo — mod(a, b)", insert: "mod(,)",       cursor: 4 },
      { label: "hypot", title: "hypot(a, b) = √(a²+b²)", insert: "hypot(,)", cursor: 6 },
    ],
  },
  {
    label: "Trig",
    buttons: [
      { label: "sin",    insert: "sin()",    cursor: 4 },
      { label: "cos",    insert: "cos()",    cursor: 4 },
      { label: "tan",    insert: "tan()",    cursor: 4 },
      { label: "sin⁻¹", title: "arcsin",    insert: "arcsin()", cursor: 7 },
      { label: "cos⁻¹", title: "arccos",    insert: "arccos()", cursor: 7 },
      { label: "tan⁻¹", title: "arctan",    insert: "arctan()", cursor: 7 },
      { label: "sec",    insert: "sec()",    cursor: 4 },
      { label: "csc",    insert: "csc()",    cursor: 4 },
      { label: "cot",    insert: "cot()",    cursor: 4 },
      { label: "sec⁻¹", title: "arcsec",    insert: "arcsec()", cursor: 7 },
      { label: "csc⁻¹", title: "arccsc",    insert: "arccsc()", cursor: 7 },
      { label: "cot⁻¹", title: "arccot",    insert: "arccot()", cursor: 7 },
      { label: "atan2",  title: "atan2(y, x) — angle of point", insert: "atan2(,)", cursor: 6 },
    ],
  },
  {
    label: "Hyp",
    buttons: [
      { label: "sinh",    insert: "sinh()",    cursor: 5 },
      { label: "cosh",    insert: "cosh()",    cursor: 5 },
      { label: "tanh",    insert: "tanh()",    cursor: 5 },
      { label: "sinh⁻¹", title: "arcsinh",    insert: "arcsinh()", cursor: 8 },
      { label: "cosh⁻¹", title: "arccosh",    insert: "arccosh()", cursor: 8 },
      { label: "tanh⁻¹", title: "arctanh",    insert: "arctanh()", cursor: 8 },
      { label: "sech",    insert: "sech()",    cursor: 5 },
      { label: "csch",    insert: "csch()",    cursor: 5 },
      { label: "coth",    insert: "coth()",    cursor: 5 },
    ],
  },
  {
    label: "Funcs",
    buttons: [
      { label: "ln",    insert: "ln()",     cursor: 3 },
      { label: "log",   title: "log base 10", insert: "log()",  cursor: 4 },
      { label: "log₂",  title: "log base 2",  insert: "log2()", cursor: 5 },
      { label: "log_b", title: "log base b — logb(x, b)", insert: "logb(,)", cursor: 5 },
      { label: "exp",   insert: "exp()",    cursor: 4 },
      { label: "⌊⌋",   title: "floor",     insert: "floor()",  cursor: 6 },
      { label: "⌈⌉",   title: "ceil",      insert: "ceil()",   cursor: 5 },
      { label: "round", insert: "round()",  cursor: 6 },
      { label: "trunc", title: "truncate toward zero", insert: "trunc()", cursor: 6 },
      { label: "frac",  title: "fractional part",      insert: "frac()",  cursor: 5 },
      { label: "sgn",   title: "sign (−1, 0, 1)",      insert: "sign()",  cursor: 5 },
      { label: "max",   insert: "max(,)",   cursor: 4 },
      { label: "min",   insert: "min(,)",   cursor: 4 },
      { label: "clamp", title: "clamp(x, lo, hi)", insert: "clamp(,,)", cursor: 6 },
      { label: "sinc",  title: "sin(x)/x",  insert: "sinc()",   cursor: 5 },
      { label: "H(x)",  title: "Heaviside step", insert: "step()", cursor: 5 },
    ],
  },
  {
    label: "Discrete",
    buttons: [
      { label: "n!",   title: "factorial — factorial(n), real n via Γ", insert: "factorial()", cursor: 10 },
      { label: "Γ",    title: "gamma function",            insert: "gamma()", cursor: 6 },
      { label: "nCr",  title: "combinations — ncr(n, r)",  insert: "ncr(,)",  cursor: 4 },
      { label: "nPr",  title: "permutations — npr(n, r)",  insert: "npr(,)",  cursor: 4 },
      { label: "gcd",  title: "greatest common divisor",   insert: "gcd(,)",  cursor: 4 },
      { label: "lcm",  title: "least common multiple",     insert: "lcm(,)",  cursor: 4 },
    ],
  },
  {
    label: "Convert",
    buttons: [
      { label: "→deg", title: "radians → degrees", insert: "deg()", cursor: 4 },
      { label: "→rad", title: "degrees → radians", insert: "rad()", cursor: 4 },
    ],
  },
  {
    label: "Calc",
    buttons: [
      { label: "f′",   title: "derivative — add ' after function name", insert: "'"  },
      { label: "f′′",  title: "second derivative",                       insert: "''" },
      { label: "{ }",  title: "domain constraint  e.g. { 0 < x <= 5 }", insert: "{  }", cursor: 2 },
    ],
  },
  {
    label: "Tools",
    buttons: [
      { label: "reflect()", title: "reflect(f, g) — reflection tool", insert: "reflect(, )", cursor: 8 },
    ],
  },
];

const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
)?.set;

function insertAtCursor(template: string, cursorOffset: number) {
  const el = document.activeElement as HTMLInputElement | null;
  if (!el || el.tagName !== "INPUT") return;
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd   ?? el.value.length;
  const next  = el.value.slice(0, start) + template + el.value.slice(end);
  nativeSetter?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const pos = start + cursorOffset;
  requestAnimationFrame(() => el.setSelectionRange(pos, pos));
}

const BTN_BASE: React.CSSProperties = {
  padding: "3px 7px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 4,
  color: "rgba(255,255,255,0.78)",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "monospace",
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  transition: "background 0.1s, border-color 0.1s",
};

export function FunctionPalette() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      flexShrink: 0,
      background: "#181818",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      userSelect: "none",
    }}>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        style={{
          width: "100%",
          padding: "5px 12px",
          background: "none",
          border: "none",
          borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none",
          color: "rgba(255,255,255,0.38)",
          cursor: "pointer",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: "0.05em",
        }}
      >
        <span style={{
          fontSize: 8,
          display: "inline-block",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }}>
          ▲
        </span>
        FUNCTIONS
      </button>

      {open && (
        <div style={{
          display: "flex",
          gap: 14,
          padding: "8px 12px 10px",
          overflowX: "auto",
          alignItems: "flex-start",
        }}>
          {GROUPS.map(group => (
            <div key={group.label} style={{ flexShrink: 0 }}>
              <div style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.28)",
                letterSpacing: "0.08em",
                fontWeight: 600,
                marginBottom: 5,
              }}>
                {group.label.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {group.buttons.map(btn => (
                  <button
                    key={btn.label}
                    title={btn.title ?? btn.insert}
                    onMouseDown={e => {
                      e.preventDefault();
                      insertAtCursor(btn.insert, btn.cursor ?? btn.insert.length);
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    style={{ ...BTN_BASE }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
