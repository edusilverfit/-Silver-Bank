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

// Mocks das operações do Prisma
const mockTx = {
  account: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
  },

  transaction: {
    create: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },

  $transaction: jest.fn<
    (
      callback: (tx: typeof mockTx) => Promise<unknown>
    ) => Promise<unknown>
  >(),
};

let app: Express;

beforeAll(async () => {
  process.env.JWT_SECRET = "chave-de-teste-silver-bank";

  jest.doMock("../../config/prisma.js", () => ({
    prisma: mockPrisma,
  }));

  mockPrisma.$transaction.mockImplementation(
    async (callback) => callback(mockTx)
  );

  ({ default: app } = await import("../../app.js"));
});

describe("Operações bancárias - Depósitos", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.JWT_SECRET = "chave-de-teste-silver-bank";
  });

  it("deve impedir depósito sem autenticação", async () => {
    const response = await request(app)
      .post("/api/accounts/deposit")
      .send({
        amount: "150.00",
      });

    expect(response.status).toBe(401);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve impedir depósito com valor inválido", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    const response = await request(app)
      .post("/api/accounts/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "0",
      });

    expect(response.status).toBe(400);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve realizar depósito com sucesso", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockTx.account.findFirst.mockResolvedValue({
      id: "account-123",
      userId: "user-123",
      accountNumber: "12345678",
      balance: "100.00",
    });

    mockTx.account.update.mockResolvedValue({
      accountNumber: "12345678",
      balance: "250.00",
    });

    mockTx.transaction.create.mockResolvedValue({
      id: "transaction-123",
      amount: "150.00",
    });

    const response = await request(app)
      .post("/api/accounts/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "150.00",
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Depósito realizado com sucesso!"
    );

    expect(response.body.deposit.amount).toBe("150.00");

    expect(response.body.account.balance).toBe("250.00");

    expect(mockTx.account.findFirst).toHaveBeenCalled();

    expect(mockTx.account.update).toHaveBeenCalled();

    expect(mockTx.transaction.create).toHaveBeenCalled();
  });

  it("deve retornar erro quando a conta não existir", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockTx.account.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/accounts/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "150.00",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });
});