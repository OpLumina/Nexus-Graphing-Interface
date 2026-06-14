// BP-5: setup for the jsdom ("ui") vitest project. Registers jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, ...) and cleans up the React tree after
// each test so component tests don't leak DOM between cases.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
