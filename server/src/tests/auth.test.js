import request from "supertest";
import { createApp } from "../app.js";

describe("health", () => {
  it("GET /health returns ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
