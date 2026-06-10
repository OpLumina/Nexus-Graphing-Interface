import { post, get } from "./client";

export interface ComputeRequest {
  op: string;
  inputs: Record<string, unknown>;
}

export interface ComputeResponse {
  result: Record<string, unknown>;
  ok: boolean;
  error?: string;
}

export function compute(op: string, inputs: Record<string, unknown>): Promise<ComputeResponse> {
  return post<ComputeRequest, ComputeResponse>("/compute", { op, inputs });
}

export function health(): Promise<{ ok: boolean }> {
  return get<{ ok: boolean }>("/health");
}
