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
  userId: string;
  accountNumber: string;
  balance: number;
  user: {
    name: string;
  };
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
  where: {
    createdAt?: {
      gte: Date;
    };
    [key: string]: unknown;
  };
  orderBy?: {
    createdAt: "desc";
  };
};

const mockPrisma = {
  account: {
    findFirst: jest.fn<(...args: unknown[]) => Promise<TestAccount | null>>(),
  },
  transaction: {
    findMany: jest.fn<
      (query: StatementQuery) => Promise<TestTransaction[]>
    >(),
  },
};

const mockPdfDocument = {
  y: 100,

  fontSize: jest.fn(),
  fillColor: jest.fn(),
  text: jest.fn(),
  moveDown: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  strokeColor: jest.fn(),
  stroke: jest.fn(),
  switchToPage: jest.fn(),

  pipe: jest.fn(),

  bufferedPageRange: jest.fn(),

  end: jest.fn(),
};

let app: Express;
let pdfResponse: any;

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
  userId: "user-123",
  accountNumber: "12345678",
  balance: 500,
  user: {
    name: "Usuário Teste",
  },
};

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

  jest.doMock("pdfkit", () => ({
    __esModule: true,

    default: jest.fn().mockImplementation(() => mockPdfDocument),
  }));

  ({ default: app } = await import("../../app.js"));
});

beforeEach(() => {
  jest.clearAllMocks();

  process.env.JWT_SECRET = JWT_SECRET;

  pdfResponse = null;

  mockPrisma.account.findFirst.mockImplementation(async () => account);

  mockPrisma.transaction.findMany.mockImplementation(async () => [
    transaction,
  ]);

  mockPdfDocument.pipe.mockImplementation((response: any) => {
    pdfResponse = response;
    return response;
  });

  mockPdfDocument.bufferedPageRange.mockReturnValue({
    start: 0,
    count: 1,
  });

  mockPdfDocument.end.mockImplementation(() => {
    pdfResponse.end(
      Buffer.from("%PDF-1.4 Silver Bank teste")
    );
  });

  mockPdfDocument.fontSize.mockReturnValue(mockPdfDocument);
  mockPdfDocument.fillColor.mockReturnValue(mockPdfDocument);
  mockPdfDocument.text.mockReturnValue(mockPdfDocument);
  mockPdfDocument.moveDown.mockReturnValue(mockPdfDocument);
  mockPdfDocument.moveTo.mockReturnValue(mockPdfDocument);
  mockPdfDocument.lineTo.mockReturnValue(mockPdfDocument);
  mockPdfDocument.strokeColor.mockReturnValue(mockPdfDocument);
  mockPdfDocument.stroke.mockReturnValue(mockPdfDocument);
  mockPdfDocument.switchToPage.mockReturnValue(mockPdfDocument);
});

describe("Exportação do extrato em PDF", () => {
  it("deve impedir a exportação sem autenticação", async () => {
    const response = await request(app)
      .get("/api/accounts/statement/pdf");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve retornar erro quando a conta não existir", async () => {
    mockPrisma.account.findFirst.mockImplementation(async () => null);

    const response = await request(app)
      .get("/api/accounts/statement/pdf")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Conta bancária não encontrada."
    );

    expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it("deve rejeitar um tipo de transação inválido", async () => {
    const response = await request(app)
      .get("/api/accounts/statement/pdf?type=INVALID")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Tipo de transação inválido."
    );
  });

  it("deve rejeitar uma data inicial inválida", async () => {
    const response = await request(app)
      .get("/api/accounts/statement/pdf?startDate=data-invalida")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Data inicial inválida."
    );
  });

  it("deve gerar o PDF com sucesso", async () => {
    const response = await request(app)
      .get("/api/accounts/statement/pdf")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(200);

    expect(response.headers["content-type"]).toContain(
      "application/pdf"
    );

    expect(response.headers["content-disposition"]).toContain(
      'filename="silver-bank-extrato.pdf"'
    );

    expect(Buffer.isBuffer(response.body)).toBe(true);

    expect(response.body.toString()).toContain("%PDF-1.4");

    expect(mockPrisma.transaction.findMany).toHaveBeenCalled();

    expect(mockPdfDocument.end).toHaveBeenCalled();
  });

  it("deve aplicar o filtro por tipo de transação", async () => {
    await request(app)
      .get("/api/accounts/statement/pdf?type=DEPOSIT")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "DEPOSIT",
        }),
      })
    );
  });

  it("deve aplicar o filtro por data inicial", async () => {
    await request(app)
      .get("/api/accounts/statement/pdf?startDate=2026-01-01")
      .set("Authorization", `Bearer ${generateToken()}`);

    const query = mockPrisma.transaction.findMany.mock.calls[0][0];
    const startDate = query.where.createdAt?.gte;

    expect(startDate).toBeInstanceOf(Date);
    expect(startDate?.toISOString()).toContain("2026-01-01");
  });

  it("deve aplicar a pesquisa por descrição", async () => {
    await request(app)
      .get("/api/accounts/statement/pdf?search=depósito")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          description: {
            contains: "depósito",
            mode: "insensitive",
          },
        }),
      })
    );
  });

  it("deve ordenar as transações da mais recente para a mais antiga", async () => {
    await request(app)
      .get("/api/accounts/statement/pdf")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: "desc",
        },
      })
    );
  });

  it("deve retornar erro quando ocorrer uma falha no banco de dados", async () => {
    mockPrisma.transaction.findMany.mockImplementation(async () => {
      throw new Error("Erro simulado no banco de dados");
    });

    const response = await request(app)
      .get("/api/accounts/statement/pdf")
      .set("Authorization", `Bearer ${generateToken()}`);

    expect(response.status).toBe(500);

    expect(response.body.message).toBe(
      "Erro ao gerar extrato bancário em PDF."
    );
  });
});