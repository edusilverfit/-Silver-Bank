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
import jwt from "jsonwebtoken";

type TestAccount = {
  id: string;
  accountNumber: string;
  balance: number;
  createdAt: Date;
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },

  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
  },
};

let app: Express;

const JWT_SECRET = "chave-de-teste-silver-bank";

function generateToken() {
  return jwt.sign(
    { sub: "user-123" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

const account = {
  id: "account-123",
  accountNumber: "12345678",
  balance: 500,
  createdAt: new Date("2026-01-01T10:00:00Z"),
};

beforeAll(async () => {
  jest.doMock("../../config/prisma.js", () => ({
    prisma: mockPrisma,
  }));

  ({ default: app } = await import("../../app.js"));
});

beforeEach(() => {
  jest.clearAllMocks();

  process.env.JWT_SECRET = JWT_SECRET;
});

describe("Consulta da conta bancária", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .get("/api/accounts");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 401 quando o token for inválido", async () => {
    const response = await request(app)
      .get("/api/accounts")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token inválido ou expirado."
    );
  });

  it("deve retornar 404 quando o usuário não possuir conta bancária", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Nenhuma conta bancária encontrada."
    );
  });

  it("deve consultar os dados bancários com sucesso", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    const response = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Dados bancários encontrados!"
    );

    expect(response.body.account).toEqual({
      id: "account-123",
      accountNumber: "12345678",
      balance: 500,
      createdAt: account.createdAt.toISOString(),
    });

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        createdAt: true,
      },
    });
  });

  it("deve retornar 500 quando ocorrer um erro no banco de dados", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => {
      throw new Error("Erro de conexão");
    });

    const response = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(500);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Erro ao consultar dados bancários."
    );
  });
});