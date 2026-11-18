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

type CreateAccountArgs = {
  data: {
    accountNumber: string;
    userId: string;
  };
  select: {
    id: true;
    accountNumber: true;
    balance: true;
    createdAt: true;
  };
};

const mockPrisma = {
  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
    create: jest.fn<(args: CreateAccountArgs) => Promise<TestAccount>>(),
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
  balance: 0,
  createdAt: new Date("2026-01-15T10:00:00Z"),
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

  mockPrisma.account.findFirst.mockImplementation(async () => null);

  mockPrisma.account.create.mockImplementation(async () => account);
});

describe("Criação de conta bancária", () => {
  it("deve impedir a criação sem autenticação", async () => {
    const response = await request(app)
      .post("/api/accounts");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );

    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("deve impedir a criação quando o usuário já possui uma conta", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    const response = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Este usuário já possui uma conta bancária."
    );

    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("deve criar uma conta bancária com sucesso", async () => {
    const response = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Conta bancária criada com sucesso!"
    );

    expect(response.body.account).toEqual({
      ...account,
      createdAt: account.createdAt.toISOString(),
    });

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
      },
    });

    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: {
        accountNumber: expect.any(String),
        userId: "user-123",
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        createdAt: true,
      },
    });

    const createCall = mockPrisma.account.create.mock.calls[0][0];

    expect(createCall.data.accountNumber).toMatch(/^\d{8}$/);
  });

  it("deve retornar erro quando ocorrer uma falha na consulta ao banco", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => {
      throw new Error("Erro simulado no banco de dados");
    });

    const response = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(500);

    expect(response.body.message).toBe(
      "Erro interno ao criar conta bancária."
    );

    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando ocorrer uma falha na criação da conta", async () => {
    mockPrisma.account.create.mockImplementation(async () => {
      throw new Error("Falha ao criar conta");
    });

    const response = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(500);

    expect(response.body.message).toBe(
      "Erro interno ao criar conta bancária."
    );
  });
});