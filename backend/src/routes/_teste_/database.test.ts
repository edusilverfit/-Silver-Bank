import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { Express } from "express";
import request from "supertest";

const mockPrisma = {
  $connect: jest.fn<(...args: unknown[]) => Promise<void>>(),
  $queryRaw: jest.fn<
    (...args: unknown[]) => Promise<Array<{ "?column?": number }>>
  >(),
};

let app: Express;

beforeAll(async () => {
  jest.doMock("../../prisma.js", () => ({
    prisma: mockPrisma,
  }));

  ({ default: app } = await import("../../app.js"));
});

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.$connect.mockImplementation(async () => {});
  mockPrisma.$queryRaw.mockImplementation(async () => [{ "?column?": 1 }]);
});

describe("Verificação da conexão com o banco de dados", () => {
  it("deve confirmar a conexão com o PostgreSQL", async () => {
    const response = await request(app)
      .get("/api/database");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "Silver Bank conectado ao PostgreSQL!",
      database: "online",
    });

    expect(mockPrisma.$connect).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("deve retornar erro quando não conseguir conectar ao banco", async () => {
    mockPrisma.$connect.mockImplementation(async () => {
      throw new Error("Falha na conexão");
    });

    const response = await request(app)
      .get("/api/database");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Erro na conexão com o banco de dados.",
    });

    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando a consulta ao banco falhar", async () => {
    mockPrisma.$queryRaw.mockImplementation(async () => {
      throw new Error("Falha na consulta");
    });

    const response = await request(app)
      .get("/api/database");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Erro na conexão com o banco de dados.",
    });

    expect(mockPrisma.$connect).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});