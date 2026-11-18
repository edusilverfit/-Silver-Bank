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

// Mocks do Prisma
type TestAccount = {
  id: string;
  userId: string;
  accountNumber: string;
  balance: number;
};

const mockTx = {
  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
    findUnique: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
    updateMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    update: jest.fn<(...args: unknown[]) => Promise<TestAccount>>(),
  },
  transaction: {
    create: jest.fn<(...args: unknown[]) => Promise<{ id: string }>>(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },

  $transaction: jest.fn<
    (callback: (tx: typeof mockTx) => Promise<unknown>) => Promise<unknown>
  >(),
};

let app: Express;

const JWT_SECRET = "chave-de-teste-silver-bank";

// Gerar token de autenticação
function generateToken() {
  return jwt.sign(
    { sub: "user-123" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// Conta de origem
const originAccount = {
  id: "account-123",
  userId: "user-123",
  accountNumber: "12345678",
  balance: 500,
};

// Conta de destino
const targetAccount = {
  id: "account-456",
  userId: "user-456",
  accountNumber: "87654321",
  balance: 200,
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

  mockPrisma.$transaction.mockImplementation(async (callback) =>
    callback(mockTx)
  );
});

describe("Transferências bancárias", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .post("/api/accounts/transfer")
      .send({
        destinationAccount: "87654321",
        amount: "100",
      });

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 400 quando o número da conta de destino for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "123",
        amount: "100",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Número da conta de destino inválido."
    );
  });

  it("deve retornar 400 quando o valor da transferência for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "0",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Informe um valor válido."
    );
  });

  it("deve retornar 404 quando a conta de origem não existir", async () => {
    mockTx.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "100",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta de origem não encontrada."
    );
  });

  it("deve retornar 404 quando a conta de destino não existir", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.account.findUnique.mockImplementation(async () => null);

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "100",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta de destino não encontrada."
    );
  });

  it("deve impedir uma transferência para a própria conta", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.account.findUnique.mockImplementation(async () => ({
      ...originAccount,
    }));

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "12345678",
        amount: "100",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Não é possível transferir para sua própria conta."
    );
  });

  it("deve retornar 409 quando não houver saldo suficiente", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "600",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Saldo insuficiente para realizar a transferência."
    );
  });

  it("deve realizar a transferência com sucesso", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.account.findUnique
      .mockImplementationOnce(async () => targetAccount)
      .mockImplementationOnce(async () => ({
        ...originAccount,
        balance: 400,
      }));

    mockTx.account.updateMany.mockImplementation(async () => ({
      count: 1,
    }));

    mockTx.account.update.mockImplementation(async () => ({
      ...targetAccount,
      balance: 300,
    }));

    mockTx.transaction.create.mockImplementation(async () => ({
      id: "transaction-123",
    }));

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "100",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Transferência realizada com sucesso!"
    );

    expect(response.body.transfer).toEqual({
      transactionId: "transaction-123",
      destinationAccount: "87654321",
      amount: "100",
      balance: 400,
    });

    expect(mockTx.account.updateMany).toHaveBeenCalled();

    expect(mockTx.account.update).toHaveBeenCalled();

    expect(mockTx.transaction.create).toHaveBeenCalled();
  });

  it("não deve registrar a transferência quando o débito não for realizado", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.account.findUnique.mockImplementation(async () => targetAccount);

    mockTx.account.updateMany.mockImplementation(async () => ({
      count: 0,
    }));

    const response = await request(app)
      .post("/api/accounts/transfer")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        destinationAccount: "87654321",
        amount: "100",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Saldo insuficiente para realizar a transferência."
    );

    expect(mockTx.account.update).not.toHaveBeenCalled();

    expect(mockTx.transaction.create).not.toHaveBeenCalled();
  });
});