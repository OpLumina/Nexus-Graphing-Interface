const BASE = "/api";

export async function post<Req, Res>(path: string, body: Req): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend ${path} returned ${res.status}`);
  return res.json() as Promise<Res>;
}

export async function get<Res>(path: string): Promise<Res> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Backend ${path} returned ${res.status}`);
  return res.json() as Promise<Res>;
}
