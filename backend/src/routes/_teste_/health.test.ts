import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";

describe("Health Check - API", () => {
  it("deve retornar status 200 e confirmar que a API está online", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "Silver Bank API funcionando!",
      status: "online",
    });
  });
});