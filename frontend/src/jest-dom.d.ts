// BP-5: make the @testing-library/jest-dom matcher augmentation (toBeInTheDocument,
// toHaveTextContent, ...) visible to `tsc` for the jsdom UI tests. The runtime
// registration happens in vitest.setup.ts; this side-effect import only pulls in
// the `declare module "vitest"` Assertion augmentation at typecheck time.
import "@testing-library/jest-dom/vitest";
