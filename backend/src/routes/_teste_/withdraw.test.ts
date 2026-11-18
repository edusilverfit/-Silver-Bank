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

// Simulação das operações do Prisma
const mockTx = {
  account: {
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
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

describe("Operações bancárias - Saques", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.JWT_SECRET = "chave-de-teste-silver-bank";
  });

  it("deve impedir saque sem autenticação", async () => {
    const response = await request(app)
      .post("/api/accounts/withdraw")
      .send({
        amount: "100.00",
      });

    expect(response.status).toBe(401);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve impedir saque com valor zero", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    const response = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "0",
      });

    expect(response.status).toBe(400);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve impedir saque com valor negativo", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    const response = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "-50.00",
      });

    expect(response.status).toBe(400);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deve realizar saque com sucesso", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockTx.account.findFirst.mockResolvedValue({
      id: "account-123",
      userId: "user-123",
      accountNumber: "12345678",
      balance: "500.00",
    });

    mockTx.account.updateMany.mockResolvedValue({
      count: 1,
    });

    mockTx.account.findUnique.mockResolvedValue({
      accountNumber: "12345678",
      balance: "400.00",
    });

    mockTx.transaction.create.mockResolvedValue({
      id: "transaction-123",
      amount: "100.00",
    });

    const response = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "100.00",
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Saque realizado com sucesso!"
    );

    expect(response.body.withdrawal.amount).toBe("100.00");

    expect(response.body.account.balance).toBe("400.00");

    expect(mockTx.account.findFirst).toHaveBeenCalled();

    expect(mockTx.account.updateMany).toHaveBeenCalled();

    expect(mockTx.account.findUnique).toHaveBeenCalled();

    expect(mockTx.transaction.create).toHaveBeenCalled();
  });

  it("deve impedir saque quando não houver saldo suficiente", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockTx.account.findFirst.mockResolvedValue({
      id: "account-123",
      userId: "user-123",
      accountNumber: "12345678",
      balance: "50.00",
    });

    const response = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "100.00",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Saldo insuficiente para realizar o saque."
    );

    expect(mockTx.transaction.create).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando a conta não existir", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockTx.account.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/accounts/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "100.00",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });
});