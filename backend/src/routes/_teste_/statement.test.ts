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

// Mock do Prisma
type TestAccount = {
  id: string;
  userId: string;
  accountNumber: string;
  balance: number;
};

type TestTransaction = {
  id: string;
  type: string;
  status: string;
  amount: string;
  description: string;
  createdAt: Date;
  fromAccountId: string | null;
  toAccountId: string | null;
};

type StatementQuery = {
  where: Record<string, unknown>;
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },

  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
  },

  transaction: {
    findMany: jest.fn<
      (query: StatementQuery) => Promise<TestTransaction[]>
    >(),
    count: jest.fn<(...args: unknown[]) => Promise<number>>(),
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

// Conta utilizada nos testes
const account = {
  id: "account-123",
  userId: "user-123",
  accountNumber: "12345678",
  balance: 500,
};

// Transação fictícia
const transaction = {
  id: "transaction-123",
  type: "DEPOSIT",
  status: "COMPLETED",
  amount: "100",
  description: "Depósito em conta",
  createdAt: new Date("2026-01-15T10:00:00Z"),
  fromAccountId: null,
  toAccountId: "account-123",
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

  mockPrisma.account.findFirst.mockImplementation(async () => account);

  mockPrisma.transaction.findMany.mockImplementation(async () => [
    transaction,
  ]);

  mockPrisma.transaction.count.mockImplementation(async () => 1);
});

describe("Consulta do extrato bancário", () => {
  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(app)
      .get("/api/accounts/statement");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar 401 quando o token for inválido", async () => {
    const response = await request(app)
      .get("/api/accounts/statement")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token inválido ou expirado."
    );
  });

  it("deve retornar 400 quando a data inicial for inválida", async () => {
    const response = await request(app)
      .get("/api/accounts/statement")
      .query({
        startDate: "data-invalida",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Data inicial inválida."
    );

    expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
  });

  it("deve retornar 404 quando a conta bancária não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .get("/api/accounts/statement")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );
  });

  it("deve consultar o extrato com sucesso", async () => {
    const response = await request(app)
      .get("/api/accounts/statement")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Extrato bancário consultado com sucesso!"
    );

    expect(response.body.account.accountNumber).toBe(
      "12345678"
    );

    expect(response.body.transactions).toHaveLength(1);

    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it("deve aplicar o filtro por tipo de transação", async () => {
    await request(app)
      .get("/api/accounts/statement")
      .query({
        type: "DEPOSIT",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "DEPOSIT",
        }),
      })
    );
  });

  it("deve ignorar um tipo de transação não permitido", async () => {
    await request(app)
      .get("/api/accounts/statement")
      .query({
        type: "INVALID",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    const query = mockPrisma.transaction.findMany.mock.calls[0][0];

    expect(query.where).not.toHaveProperty("type");
  });

  it("deve aplicar o filtro por data inicial", async () => {
    await request(app)
      .get("/api/accounts/statement")
      .query({
        startDate: "2026-01-01T00:00:00.000Z",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
          },
        }),
      })
    );
  });

  it("deve aplicar a pesquisa por descrição", async () => {
    await request(app)
      .get("/api/accounts/statement")
      .query({
        search: "mercado",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                {
                  description: {
                    contains: "mercado",
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        }),
      })
    );
  });

  it("deve permitir pesquisar pelo nome do tipo de transação", async () => {
    await request(app)
      .get("/api/accounts/statement")
      .query({
        search: "depósito",
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  type: {
                    in: ["DEPOSIT"],
                  },
                }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("deve aplicar a paginação corretamente", async () => {
    mockPrisma.transaction.findMany.mockImplementation(async () => []);

    mockPrisma.transaction.count.mockImplementation(async () => 25);

    const response = await request(app)
      .get("/api/accounts/statement")
      .query({
        page: 2,
      })
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it("deve retornar 500 quando ocorrer um erro na consulta", async () => {
    mockPrisma.transaction.findMany.mockImplementation(async () => {
      throw new Error("Erro de conexão");
    });

    const response = await request(app)
      .get("/api/accounts/statement")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(500);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Erro interno ao consultar extrato."
    );
  });
});