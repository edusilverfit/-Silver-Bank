import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const mockPrisma = {
  user: {
    findUnique: jest.fn<(args: unknown) => Promise<unknown>>(),
    create: jest.fn<
      (args: unknown) => Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
      }>
    >(),
  },
};

const mockBcrypt = {
  hash: jest.fn<(password: string, rounds: number) => Promise<string>>(),
  compare: jest.fn<(password: string, hash: string) => Promise<boolean>>(),
};

let app: Express;

beforeAll(async () => {
  jest.doMock("../../config/prisma.js", () => ({
    prisma: mockPrisma,
  }));
  jest.doMock("bcryptjs", () => ({
    __esModule: true,
    default: mockBcrypt,
  }));

  ({ default: app } = await import("../../app.js"));
});

describe("Autenticação - Cadastro", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "chave-de-teste-silver-bank";
  });

  it("deve impedir cadastro sem preencher todos os campos", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "",
        email: "",
        password: "",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Preencha todos os campos.",
    });
  });

  it("deve cadastrar um usuário com sucesso", async () => {
    mockPrisma.user.findUnique.mockImplementation(async () => null);
    mockPrisma.user.create.mockImplementation(async () => ({
      id: "user-123",
      name: "Usuário Teste",
      email: "teste@silverband.com",
      createdAt: new Date("2026-01-01"),
    }));
    mockBcrypt.hash.mockImplementation(async () => "senha-criptografada");

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Usuário Teste",
        email: "TESTE@SILVERBANK.COM",
        password: "senha12345",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe("teste@silverband.com");
    expect(response.body.user).not.toHaveProperty("password");
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockBcrypt.hash).toHaveBeenCalledWith("senha12345", 10);
  });

  describe("Autenticação - Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "chave-de-teste-silver-bank";
  });

  it("deve rejeitar dados com tipos inválidos", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: 123,
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(400);

  expect(response.body.message).toBe(
    "Os dados enviados são inválidos."
  );
});

it("deve rejeitar senha com menos de 8 caracteres", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Usuário Teste",
      email: "teste@silverband.com",
      password: "1234567",
    });

  expect(response.status).toBe(400);

  expect(response.body.message).toBe(
    "A senha precisa ter pelo menos 8 caracteres."
  );
});

it("deve impedir cadastro com e-mail já existente", async () => {
  mockPrisma.user.findUnique.mockImplementation(async () => ({
    id: "user-123",
    name: "Usuário Existente",
    email: "teste@silverband.com",
    password: "senha-criptografada",
  }));

  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Novo Usuário",
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(409);

  expect(response.body.message).toBe(
    "Este e-mail já está cadastrado."
  );

  expect(mockBcrypt.hash).not.toHaveBeenCalled();
  expect(mockPrisma.user.create).not.toHaveBeenCalled();
});

it("deve retornar erro quando a criptografia da senha falhar", async () => {
  mockPrisma.user.findUnique.mockImplementation(async () => null);

  mockBcrypt.hash.mockRejectedValue(
    new Error("Erro simulado na criptografia")
  );

  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Usuário Teste",
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(500);

  expect(response.body.message).toBe(
    "Erro interno ao cadastrar usuário."
  );

  expect(mockPrisma.user.create).not.toHaveBeenCalled();
});

it("deve retornar erro quando a criação do usuário falhar", async () => {
  mockPrisma.user.findUnique.mockImplementation(async () => null);

  mockBcrypt.hash.mockImplementation(
    async () => "senha-criptografada"
  );

  mockPrisma.user.create.mockRejectedValue(
    new Error("Erro simulado ao criar usuário")
  );

  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Usuário Teste",
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(500);

  expect(response.body.message).toBe(
    "Erro interno ao cadastrar usuário."
  );
});

  it("deve impedir login com campos vazios", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "",
        password: "",
      });

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
  });

  it("deve retornar erro quando o usuário não existir", async () => {
    mockPrisma.user.findUnique.mockImplementation(async () => null);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "inexistente@silverband.com",
        password: "senha12345",
      });

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "E-mail ou senha incorretos."
    );
  });

  it("deve impedir login com senha incorreta", async () => {
    mockPrisma.user.findUnique.mockImplementation(async () => ({
      id: "user-123",
      name: "Usuário Teste",
      email: "teste@silverband.com",
      password: "senha-criptografada",
    }));

    mockBcrypt.compare.mockImplementation(async () => false);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "teste@silverband.com",
        password: "senhaerrada",
      });

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "E-mail ou senha incorretos."
    );
  });

  it("deve realizar login e retornar um token JWT", async () => {
    mockPrisma.user.findUnique.mockImplementation(async () => ({
      id: "user-123",
      name: "Usuário Teste",
      email: "teste@silverband.com",
      password: "senha-criptografada",
    }));

    mockBcrypt.compare.mockImplementation(async () => true);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "teste@silverband.com",
        password: "senha12345",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body).toHaveProperty("token");

    expect(response.body.user.email).toBe(
      "teste@silverband.com"
    );

    expect(response.body.user).not.toHaveProperty("password");
  });
});

it("deve retornar erro quando os dados enviados forem inválidos", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: 123,
      password: "senha12345",
    });

  expect(response.status).toBe(400);

  expect(response.body.message).toBe(
    "Informe um e-mail e uma senha válidos."
  );
});

it("deve retornar erro quando o JWT_SECRET não estiver configurado", async () => {
  mockPrisma.user.findUnique.mockImplementation(async () => ({
    id: "user-123",
    name: "Usuário Teste",
    email: "teste@silverband.com",
    password: "senha-criptografada",
  }));

  mockBcrypt.compare.mockImplementation(async () => true);

  delete process.env.JWT_SECRET;

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(500);

  expect(response.body.message).toBe(
    "Erro interno ao realizar login."
  );
});

it("deve retornar erro quando ocorrer uma falha na consulta do usuário", async () => {
  mockPrisma.user.findUnique.mockRejectedValue(
    new Error("Erro simulado na consulta")
  );

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: "teste@silverband.com",
      password: "senha12345",
    });

  expect(response.status).toBe(500);

  expect(response.body.message).toBe(
    "Erro interno ao realizar login."
  );
});

it("deve impedir acesso quando o cabeçalho não possuir token", async () => {
  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer");

  expect(response.status).toBe(401);

  expect(response.body.message).toBe(
    "Token inválido."
  );
});

it("deve retornar erro quando JWT_SECRET não estiver configurado", async () => {
  delete process.env.JWT_SECRET;

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer token-teste");

  expect(response.status).toBe(500);

  expect(response.body.message).toBe(
    "Configuração de autenticação indisponível."
  );
});

it("deve rejeitar token cujo conteúdo decodificado seja uma string", async () => {
  const token = jwt.sign(
    "conteudo-invalido",
    process.env.JWT_SECRET!
  );

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(401);

  expect(response.body.message).toBe(
    "Token inválido."
  );
});

it("deve rejeitar token com sub diferente de string", async () => {
  const token = jwt.sign(
    { sub: 123 },
    process.env.JWT_SECRET!
  );

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(401);

  expect(response.body.message).toBe(
    "Token inválido."
  );
});

describe("Autenticação - Perfil do usuário", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "chave-de-teste-silver-bank";
  });

  it("deve impedir acesso sem token", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token de autenticação não informado."
    );
  });

  it("deve impedir acesso com token inválido", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);

    expect(response.body.message).toBe(
      "Token inválido ou expirado."
    );
  });

  it("deve retornar os dados do usuário com token válido", async () => {
    const token = jwt.sign(
      { sub: "user-123" },
      process.env.JWT_SECRET!
    );

    mockPrisma.user.findUnique.mockImplementation(async () => ({
      id: "user-123",
      name: "Usuário Teste",
      email: "teste@silverband.com",
      createdAt: new Date("2026-01-01"),
    }));

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.user.id).toBe("user-123");

    expect(response.body.user.email).toBe(
      "teste@silverband.com"
    );

    expect(response.body.user).not.toHaveProperty("password");
  });

  it("deve retornar erro quando o usuário não for encontrado", async () => {
    const token = jwt.sign(
      { sub: "user-inexistente" },
      process.env.JWT_SECRET!
    );

    mockPrisma.user.findUnique.mockImplementation(async () => null);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Usuário não encontrado."
    );
  });
});
});
