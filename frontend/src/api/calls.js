import { post, get } from "./client";
export function compute(op, inputs) {
    return post("/compute", { op, inputs });
}
export function health() {
    return get("/health");
}
