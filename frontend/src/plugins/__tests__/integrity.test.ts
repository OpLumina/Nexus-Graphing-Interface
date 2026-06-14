import { describe, it, expect } from "vitest";
import { resolveInlineJs, computeIntegrity, verifyInlineIntegrity } from "../integrity";

describe("plugin integrity (BP-4)", () => {
  it("resolveInlineJs joins line arrays with newlines and passes strings through", () => {
    expect(resolveInlineJs(["a", "b", "c"])).toBe("a\nb\nc");
    expect(resolveInlineJs("x")).toBe("x");
  });

  it("computeIntegrity yields the stable sha256 SRI token", async () => {
    // sha256("hello") base64 — a fixed, well-known value.
    expect(await computeIntegrity("hello")).toBe(
      "sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=",
    );
  });

  it("array and equivalent string hash identically", async () => {
    const arr = ["function run() {", "  return { ok: true, data: {} };", "}"];
    const str = arr.join("\n");
    expect(await computeIntegrity(resolveInlineJs(arr))).toBe(await computeIntegrity(str));
  });

  it("verifyInlineIntegrity accepts matching and rejects altered source", async () => {
    const src = "return 1 + 1;";
    const digest = await computeIntegrity(src);
    expect(await verifyInlineIntegrity(src, digest)).toBe(true);
    expect(await verifyInlineIntegrity(src + " ", digest)).toBe(false);
  });
});
