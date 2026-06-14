// BP-4: helpers for readable + verifiable plugin inline JS.
//
// A .ngplugin.json previously had to cram a tool's whole `run()` body into one
// escaped JSON string — unreviewable. The manifest now also accepts `js` as an
// ARRAY of source lines (joined with "\n"), so the code reads line-by-line in the
// JSON, and an optional Subresource-Integrity-style `integrity` digest over that
// resolved source so the loader can detect tampering/corruption before running.
//
// Scope note: the digest lives in the same file, so it does not prove authorship
// (a malicious author can recompute it). It guards against accidental corruption
// and in-transit/at-rest mutation, and gives the consent UI a stable fingerprint.

/** Collapse the manifest `js` (string or array of lines) into the source string
 *  the sandbox executes. */
export function resolveInlineJs(js: string | string[]): string {
  return Array.isArray(js) ? js.join("\n") : js;
}

/** SHA-256 of `source`, formatted as an SRI token `sha256-<base64>`. */
export async function computeIntegrity(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let bin = "";
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return `sha256-${btoa(bin)}`;
}

/** True when `source` hashes to the expected `sha256-<base64>` token. */
export async function verifyInlineIntegrity(source: string, expected: string): Promise<boolean> {
  const actual = await computeIntegrity(source);
  return actual === expected.trim();
}
