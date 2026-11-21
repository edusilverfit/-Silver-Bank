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
  type: string;
  key: string;
  accountId: string;
  createdAt: Date;
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },

  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
  },

  pixKey: {
    findUnique: jest.fn<(...args: unknown[]) => Promise<TestPixKey | null>>(),
    findMany: jest.fn<(...args: unknown[]) => Promise<TestPixKey[]>>(),
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestPixKey | null>>(),
    create: jest.fn<(...args: unknown[]) => Promise<TestPixKey>>(),
    delete: jest.fn<(...args: unknown[]) => Promise<TestPixKey>>(),
  },

  $transaction: jest.fn(),
};

let app: Express;

const JWT_SECRET = "chave-de-teste-silver-bank";


// Gerar token de autenticação
function generateToken() {
  return jwt.sign(
    { sub: "user-123" },
    JWT_SECRET,
    {
      expiresIn: "1h",
      algorithm: "HS256",
      issuer: "silver-bank-api",
      audience: "silver-bank-users",
    }
  );
}

// Conta de teste
const account = {
  id: "account-123",
  userId: "user-123",
  accountNumber: "12345678",
  balance: 500,
};

// Chave Pix de teste
const pixKey = {
  id: "pix-123",
  type: "EMAIL",
  key: "teste@email.com",
  accountId: "account-123",
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

// ==========================================
// CADASTRO DE CHAVES PIX
// ==========================================

describe("Cadastro de chaves Pix", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .send({
        type: "EMAIL",
        key: "teste@email.com",
      });

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 400 quando o tipo da chave for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "RANDOM",
        key: "teste@email.com",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Tipo de chave Pix inválido."
    );
  });

  it("deve retornar 400 quando a chave não for informada", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "EMAIL",
        key: "",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Informe uma chave Pix válida."
    );
  });

  it("deve retornar 400 quando o e-mail for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "EMAIL",
        key: "email-invalido",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "E-mail inválido."
    );
  });

  it("deve retornar 400 quando o CPF não possuir 11 dígitos", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "CPF",
        key: "123456",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "O CPF deve conter 11 dígitos."
    );
  });

  it("deve retornar 400 quando o telefone for inválido", async () => {
    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "PHONE",
        key: "12345",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Telefone inválido."
    );
  });

  it("deve retornar 404 quando a conta bancária não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "EMAIL",
        key: "teste@email.com",
      });

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });

  it("deve retornar 409 quando a chave Pix já estiver cadastrada", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    mockPrisma.pixKey.findUnique.mockImplementation(async () => pixKey);

    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "EMAIL",
        key: "teste@email.com",
      });

    expect(response.status).toBe(409);

    expect(response.body.message).toBe(
      "Essa chave Pix já está cadastrada."
    );
  });

  it("deve cadastrar uma chave Pix com sucesso", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    mockPrisma.pixKey.findUnique.mockImplementation(async () => null);

    mockPrisma.pixKey.create.mockImplementation(async () => ({
      ...pixKey,
      key: "novo@email.com",
    }));

    const response = await request(app)
      .post("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`)
      .send({
        type: "EMAIL",
        key: "  NOVO@EMAIL.COM  ",
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Chave Pix cadastrada com sucesso!"
    );

    expect(response.body.pixKey.key).toBe(
      "novo@email.com"
    );

    expect(mockPrisma.pixKey.create).toHaveBeenCalledWith({
      data: {
        type: "EMAIL",
        key: "novo@email.com",
        accountId: "account-123",
      },
    });
  });
});

// ==========================================
// CONSULTA DE CHAVES PIX
// ==========================================

describe("Consulta de chaves Pix", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .get("/api/accounts/pix-keys");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 404 quando a conta bancária não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .get("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });

  it("deve listar as chaves Pix com sucesso", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    mockPrisma.pixKey.findMany.mockImplementation(async () => [
      pixKey,
    ]);

    const response = await request(app)
      .get("/api/accounts/pix-keys")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Chaves Pix encontradas!"
    );

    expect(response.body.pixKeys).toHaveLength(1);

    expect(response.body.pixKeys[0].key).toBe(
      "teste@email.com"
    );

    expect(mockPrisma.pixKey.findMany).toHaveBeenCalled();
  });
});

// ==========================================
// EXCLUSÃO DE CHAVES PIX
// ==========================================

describe("Exclusão de chaves Pix", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .delete("/api/accounts/pix-keys/pix-123");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 400 quando o identificador for inválido", async () => {
    const response = await request(app)
      .delete("/api/accounts/pix-keys/%20")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Identificador da chave Pix inválido."
    );
  });

  it("deve retornar 404 quando a conta bancária não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .delete("/api/accounts/pix-keys/pix-123")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });

  it("deve retornar 404 quando a chave Pix não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    mockPrisma.pixKey.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .delete("/api/accounts/pix-keys/pix-inexistente")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Chave Pix não encontrada."
    );
  });

  it("deve excluir uma chave Pix com sucesso", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => account);

    mockPrisma.pixKey.findFirst.mockImplementation(async () => pixKey);

    mockPrisma.pixKey.delete.mockImplementation(async () => pixKey);

    const response = await request(app)
      .delete("/api/accounts/pix-keys/pix-123")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Chave Pix excluída com sucesso!"
    );

    expect(mockPrisma.pixKey.delete).toHaveBeenCalledWith({
      where: {
        id: "pix-123",
      },
    });
  });
});