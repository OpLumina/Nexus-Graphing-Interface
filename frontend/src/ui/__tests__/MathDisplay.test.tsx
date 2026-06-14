// BP-5: proves the jsdom ("ui") vitest project can mount and assert on real
// React components. MathDisplay is a pure props-only component (no store), so it
// exercises the render pipeline without dragging in app state.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathDisplay } from "../MathDisplay";

describe("MathDisplay (jsdom UI smoke)", () => {
  it("renders KaTeX markup for a valid expression", () => {
    const { container } = render(<MathDisplay latex="x^2" />);
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it("falls back to a <code> element with the raw text when latex is empty", () => {
    const { container } = render(<MathDisplay latex="" />);
    expect(container.querySelector("code")).toBeInTheDocument();
  });
});
