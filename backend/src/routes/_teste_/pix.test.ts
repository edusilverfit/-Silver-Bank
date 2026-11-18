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

type TestPixKey = {
  id: string;
  key: string;
  type: string;
  accountId: string;
  account: TestAccount;
};

const mockTx = {
  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
    findUnique: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
    updateMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
    update: jest.fn<(...args: unknown[]) => Promise<TestAccount>>(),
  },
  pixKey: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<TestPixKey | null>>(),
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
const destinationAccount = {
  id: "account-456",
  userId: "user-456",
  accountNumber: "87654321",
  balance: 200,
};

// Chave Pix do destinatário
const pixKey = {
  id: "pix-123",
  key: "destinatario@email.com",
  type: "EMAIL",
  accountId: "account-456",
  account: destinationAccount,
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

describe("Transferências via Pix", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .post("/api/accounts/pix")
      .send({
        key: "destinatario@email.com",
        amount: "100",
      });

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 400 quando a chave Pix não for informada", async () => {
    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "",
        amount: "100",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Informe a chave Pix do destinatário."
    );
  });

  it("deve retornar 400 quando o valor do Pix for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "destinatario@email.com",
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
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "destinatario@email.com",
        amount: "100",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta de origem não encontrada."
    );
  });

  it("deve retornar 404 quando a chave Pix não existir", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.pixKey.findUnique.mockImplementation(async () => null);

    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "chave-inexistente@email.com",
        amount: "100",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Chave Pix não encontrada."
    );
  });

  it("deve impedir um Pix para a própria conta", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.pixKey.findUnique.mockImplementation(async () => ({
      ...pixKey,
      account: originAccount,
    }));

    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "minha-chave@email.com",
        amount: "100",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Não é possível enviar Pix para sua própria conta."
    );
  });

  it("deve retornar 409 quando não houver saldo suficiente", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.pixKey.findUnique.mockImplementation(async () => pixKey);

    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "destinatario@email.com",
        amount: "600",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Saldo insuficiente para realizar o Pix."
    );
  });

  it("deve realizar o Pix com sucesso", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.pixKey.findUnique.mockImplementation(async () => pixKey);

    mockTx.account.findUnique.mockImplementation(async () => ({
      ...originAccount,
      balance: 400,
    }));

    mockTx.account.updateMany.mockImplementation(async () => ({
      count: 1,
    }));

    mockTx.account.update.mockImplementation(async () => ({
      ...destinationAccount,
      balance: 300,
    }));

    mockTx.transaction.create.mockImplementation(async () => ({
      id: "transaction-pix-123",
    }));

    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "destinatario@email.com",
        amount: "100",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Pix realizado com sucesso!"
    );

    expect(response.body.pix).toEqual({
      transactionId: "transaction-pix-123",
      destinationAccount: "87654321",
      amount: "100",
      balance: 400,
    });

    expect(mockTx.account.updateMany).toHaveBeenCalled();

    expect(mockTx.account.update).toHaveBeenCalled();

    expect(mockTx.transaction.create).toHaveBeenCalled();
  });

  it("não deve registrar o Pix quando o débito não for realizado", async () => {
    mockTx.account.findFirst.mockImplementation(async () => originAccount);

    mockTx.pixKey.findUnique.mockImplementation(async () => pixKey);

    mockTx.account.updateMany.mockImplementation(async () => ({
      count: 0,
    }));

    const response = await request(app)
      .post("/api/accounts/pix")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        key: "destinatario@email.com",
        amount: "100",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Saldo insuficiente para realizar o Pix."
    );

    expect(mockTx.account.update).not.toHaveBeenCalled();

    expect(mockTx.transaction.create).not.toHaveBeenCalled();
  });
});