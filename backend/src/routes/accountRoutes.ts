import { Router } from "express";
import { randomInt } from "node:crypto";
import PDFDocument from "pdfkit";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import {
  authMiddleware,
  type AuthRequest,
} from "../controllers/middlewares/authMiddleware.js";
import { validateDeposit } from "../utils/deposit.js";
import { validateWithdraw } from "../utils/withdraw.js";
import { validateTransfer } from "../utils/transfer.js";
import { validatePix } from "../utils/pix.js";
import { NotificationType } from "../../generated/prisma/client.js";
import { createNotification } from "../services/notificationService.js";



const router = Router();

// CRIAR CONTA BANCÁRIA
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    // Verifica se o usuário já possui uma conta
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: req.userId,
      },
    });

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: "Este usuário já possui uma conta bancária.",
      });
    }

    // Gera número aleatório de 8 dígitos
    const accountNumber = randomInt(10000000, 100000000).toString();

    // Cria a conta
    const account = await prisma.account.create({
      data: {
        accountNumber,
        userId: req.userId,
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Conta bancária criada com sucesso!",
      account,
    });
  } catch (error) {
    console.error("Erro ao criar conta:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar conta bancária.",
    });
  }
});

// CONSULTAR CONTA BANCÁRIA
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: req.userId,
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        createdAt: true,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Nenhuma conta bancária encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dados bancários encontrados!",
      account,
    });
  } catch (error) {
    console.error("Erro ao consultar conta:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao consultar dados bancários.",
    });
  }
});


// REALIZAR DEPÓSITO
router.post("/deposit", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    const { amount } = req.body;

    // Valida o valor recebido
    if (
  typeof amount !== "string" ||
  !/^\d+(\.\d{1,2})?$/.test(amount) ||
  !validateDeposit(Number(amount))
) {
  return res.status(400).json({
    success: false,
    message: "Informe um valor válido para o depósito.",
  });
}

    // Executa as operações em uma transação do banco
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      // Busca a conta do cliente
      const account = await tx.account.findFirst({
        where: {
          userId: req.userId,
        },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      // Atualiza o saldo
      const updatedAccount = await tx.account.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Registra o depósito
      const transaction = await tx.transaction.create({
        data: {
          type: "DEPOSIT",
          status: "COMPLETED",
          amount,
          description: "Depósito em conta",
          toAccountId: account.id,
        },
      });

      return {
        account: updatedAccount,
        transaction,
      };
    });

    // Criar notificação de depósito
try {
  const formattedAmount = Number(result.transaction.amount).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );

  await createNotification(
    req.userId!,
    "Depósito realizado",
    `Seu depósito de ${formattedAmount} foi realizado com sucesso.`,
    NotificationType.DEPOSIT
  );
} catch (notificationError) {
  console.error("Erro ao criar notificação de depósito:", notificationError);
}

    return res.status(201).json({
      success: true,
      message: "Depósito realizado com sucesso!",
      deposit: {
        amount: result.transaction.amount,
        transactionId: result.transaction.id,
      },
      account: {
        accountNumber: result.account.accountNumber,
        balance: result.account.balance,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Conta bancária não encontrada.",
      });
    }

    console.error("Erro ao realizar depósito:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar depósito.",
    });
  }
});

// CONSULTAR EXTRATO BANCÁRIO
router.get("/statement/pdf", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    const account = await prisma.account.findFirst({
      where: { userId: req.userId },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Conta bancária não encontrada.",
      });
    }

   const requestedType =
  typeof req.query.type === "string" ? req.query.type : undefined;

const allowedTypes = [
  "DEPOSIT",
  "WITHDRAWAL",
  "PIX",
  "TRANSFER",
] as const;

if (
  requestedType &&
  !allowedTypes.includes(requestedType as (typeof allowedTypes)[number])
) {
  return res.status(400).json({
    success: false,
    message: "Tipo de transação inválido.",
  });
}

const requestedStartDate =
  typeof req.query.startDate === "string"
    ? req.query.startDate
    : undefined;

const startDate = requestedStartDate
  ? new Date(requestedStartDate)
  : undefined;

if (startDate && Number.isNaN(startDate.getTime())) {
  return res.status(400).json({
    success: false,
    message: "Data inicial inválida.",
  });
}

const search =
  typeof req.query.search === "string"
    ? req.query.search.trim()
    : "";

const transactions = await prisma.transaction.findMany({
  where: {
    OR: [
      { fromAccountId: account.id },
      { toAccountId: account.id },
    ],

    ...(requestedType
      ? {
          type: requestedType as (typeof allowedTypes)[number],
        }
      : {}),

    ...(startDate
      ? {
          createdAt: {
            gte: startDate,
          },
        }
      : {}),

    ...(search
      ? {
          description: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  },
  orderBy: {
    createdAt: "desc",
  },
});

    const completedTransactions = transactions.filter(
  (transaction) => transaction.status === "COMPLETED"
);

const totalIncome = completedTransactions
  .filter((transaction) => transaction.toAccountId === account.id)
  .reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  );

const totalExpenses = completedTransactions
  .filter((transaction) => transaction.fromAccountId === account.id)
  .reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  );

const currentBalance = Number(account.balance);

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="silver-bank-extrato.pdf"'
    );

    doc.pipe(res);

    // Cabeçalho
    doc
      .fontSize(24)
      .fillColor("#D4AF37")
      .text("SILVER BANK", { align: "center" });

    doc.moveDown();

    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Extrato Bancário", { align: "center" });

    doc.moveDown();

    // Dados da conta
    doc.fontSize(10).text(`Titular: ${account.user.name}`);
    doc.text(`Conta: ${account.accountNumber}`);
    doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`);

    doc.moveDown();

    // Resumo financeiro
doc
  .fontSize(14)
  .fillColor("#D4AF37")
  .text("Resumo Financeiro");

doc.moveDown(0.5);

doc
  .fontSize(10)
  .fillColor("#000000")
  .text(`Total de entradas: ${formatBRL(totalIncome)}`);

doc.text(`Total de saídas: ${formatBRL(totalExpenses)}`);

doc.text(`Saldo atual: ${formatBRL(currentBalance)}`);

doc.moveDown();

doc
  .moveTo(50, doc.y)
  .lineTo(545, doc.y)
  .strokeColor("#D4AF37")
  .stroke();

doc.moveDown();

    doc
      .fontSize(12)
      .fillColor("#D4AF37")
      .text("Histórico de Transações");

    doc.moveDown();

    // Transações
    const typeLabels: Record<string, string> = {
  DEPOSIT: "Depósito",
  WITHDRAWAL: "Saque",
  PIX: "Pix",
  TRANSFER: "Transferência",
};

const statusLabels: Record<string, string> = {
  COMPLETED: "Concluída",
  PENDING: "Pendente",
  FAILED: "Falhou",
};

transactions.forEach((transaction) => {
  const direction =
    transaction.toAccountId === account.id ? "Entrada" : "Saída";

  const amount = formatBRL(Number(transaction.amount));

  const date = new Date(transaction.createdAt).toLocaleDateString(
    "pt-BR"
  );

  doc
    .fontSize(9)
    .fillColor("#000000")
    .text(
      `${date} | ${direction} | ${
        typeLabels[transaction.type] || transaction.type
      }`
    );

  doc
    .fontSize(8)
    .fillColor("#555555")
    .text(
      `Valor: ${amount} | Status: ${
        statusLabels[transaction.status] || transaction.status
      }`
    );

  if (transaction.description) {
    doc
      .fontSize(8)
      .fillColor("#777777")
      .text(`Descrição: ${transaction.description}`);
  }

  doc.moveDown(0.7);

  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#DDDDDD")
    .stroke();

  doc.moveDown(0.7);
});

    // Numeração das páginas
const pageRange = doc.bufferedPageRange();

for (
  let page = pageRange.start;
  page < pageRange.start + pageRange.count;
  page++
) {
  doc.switchToPage(page);

  doc
    .fontSize(8)
    .fillColor("#888888")
    .text(
      `Silver Bank | Página ${page + 1} de ${pageRange.count}`,
      50,
      780,
      {
        width: 495,
        align: "center",
      }
    );
}

doc.end();
  } catch (error) {
    console.error("Erro ao gerar extrato PDF:", error);

    if (res.headersSent) {
      return res.destroy(error instanceof Error ? error : undefined);
    }

    return res.status(500).json({
      success: false,
      message: "Erro ao gerar extrato bancário em PDF.",
    });
  }
});

router.get("/statement", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    // Busca a conta do cliente autenticado

    const requestedStartDate = req.query.startDate;

let startDate: Date | undefined;

if (typeof requestedStartDate === "string") {
  const parsedDate = new Date(requestedStartDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Data inicial inválida.",
    });
  }

  startDate = parsedDate;
}

    const account = await prisma.account.findFirst({
      where: {
        userId: req.userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Conta bancária não encontrada.",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Busca as movimentações da conta
    const allowedTypes = [
  "DEPOSIT",
  "WITHDRAWAL",
  "PIX",
  "TRANSFER",
] as const;

const requestedType = req.query.type;

const transactionType =
  typeof requestedType === "string" &&
  allowedTypes.includes(requestedType as (typeof allowedTypes)[number])
    ? (requestedType as (typeof allowedTypes)[number])
    : undefined;

    const requestedSearch = req.query.search;

const search =
  typeof requestedSearch === "string"
    ? requestedSearch.trim()
    : "";

const typeLabels: Record<(typeof allowedTypes)[number], string> = {
  DEPOSIT: "Depósito",
  WITHDRAWAL: "Saque",
  PIX: "Pix",
  TRANSFER: "Transferência",
};

const matchingTypes = allowedTypes.filter((type) => {
  return (
    type.toLowerCase().includes(search.toLowerCase()) ||
    typeLabels[type].toLowerCase().includes(search.toLowerCase())
  );
});

    const where: Prisma.TransactionWhereInput = {
      OR: [
        { fromAccountId: account.id },
        { toAccountId: account.id },
      ],
      ...(transactionType ? { type: transactionType } : {}),
      ...(startDate
        ? {
            createdAt: {
              gte: startDate,
            },
          }
        : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  {
                    description: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  ...(matchingTypes.length > 0
                    ? [{ type: { in: matchingTypes } }]
                    : []),
                ],
              },
            ],
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          description: true,
          createdAt: true,
          fromAccountId: true,
          toAccountId: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Extrato bancário consultado com sucesso!",
      account: {
        accountNumber: account.accountNumber,
      },
      totalTransactions: transactions.length,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Erro ao consultar extrato:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao consultar extrato.",
    });
  }
});


// REALIZAR SAQUE
router.post("/withdraw", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    const { amount } = req.body;

    // Valida o valor solicitado
    if (
  typeof amount !== "string" ||
  !/^\d+(\.\d{1,2})?$/.test(amount) ||
  !Number.isFinite(Number(amount)) ||
  Number(amount) <= 0
) {
  return res.status(400).json({
    success: false,
    message: "Informe um valor válido para o saque.",
  });
}

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      // Busca a conta do usuário
      const account = await tx.account.findFirst({
        where: {
          userId: req.userId,
        },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (!validateWithdraw(Number(amount), Number(account.balance))) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Verifica e atualiza o saldo atomicamente
      const withdrawal = await tx.account.updateMany({
        where: {
          id: account.id,
          balance: {
            gte: amount,
          },
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      if (withdrawal.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Busca o saldo atualizado
      const updatedAccount = await tx.account.findUnique({
        where: {
          id: account.id,
        },
      });

      // Registra o saque
      const transaction = await tx.transaction.create({
        data: {
          type: "WITHDRAWAL",
          status: "COMPLETED",
          amount,
          description: "Saque em conta",
          fromAccountId: account.id,
        },
      });

      return {
        account: updatedAccount!,
        transaction,
      };
    });

    // Criar notificação de saque
try {
  const formattedAmount = Number(result.transaction.amount).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );

  await createNotification(
    req.userId!,
    "Saque realizado",
    `Seu saque de ${formattedAmount} foi realizado com sucesso.`,
    NotificationType.WITHDRAWAL
  );
} catch (notificationError) {
  console.error("Erro ao criar notificação de saque:", notificationError);
}

    return res.status(201).json({
      success: true,
      message: "Saque realizado com sucesso!",
      withdrawal: {
        amount: result.transaction.amount,
        transactionId: result.transaction.id,
      },
      account: {
        accountNumber: result.account.accountNumber,
        balance: result.account.balance,
      },
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ACCOUNT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Conta bancária não encontrada.",
        });
      }

      if (error.message === "INSUFFICIENT_BALANCE") {
        return res.status(409).json({
          success: false,
          message: "Saldo insuficiente para realizar o saque.",
        });
      }
    }

    console.error("Erro ao realizar saque:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar saque.",
    });
  }
});

// Cadastrar chave Pix
router.post("/pix-keys", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, key } = req.body;

    const allowedTypes = ["CPF", "EMAIL", "PHONE"];

    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de chave Pix inválido.",
      });
    }

    if (typeof key !== "string" || !key.trim()) {
      return res.status(400).json({
        success: false,
        message: "Informe uma chave Pix válida.",
      });
    }

    const normalizedKey =
      type === "EMAIL"
        ? key.trim().toLowerCase()
        : key.replace(/\D/g, "");

    if (type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedKey)) {
      return res.status(400).json({
        success: false,
        message: "E-mail inválido.",
      });
    }

    if (type === "CPF" && !/^\d{11}$/.test(normalizedKey)) {
      return res.status(400).json({
        success: false,
        message: "O CPF deve conter 11 dígitos.",
      });
    }

    if (type === "PHONE" && !/^\d{10,13}$/.test(normalizedKey)) {
      return res.status(400).json({
        success: false,
        message: "Telefone inválido.",
      });
    }

    const account = await prisma.account.findFirst({
      where: { userId: req.userId },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Conta bancária não encontrada.",
      });
    }

    const existingKey = await prisma.pixKey.findUnique({
      where: { key: normalizedKey },
    });

    if (existingKey) {
      return res.status(409).json({
        success: false,
        message: "Essa chave Pix já está cadastrada.",
      });
    }

    const pixKey = await prisma.pixKey.create({
      data: {
        type,
        key: normalizedKey,
        accountId: account.id,
      },
    });

    // Criar notificação de cadastro de chave Pix
try {
  await createNotification(
    req.userId!,
    "Chave Pix cadastrada",
    `Sua chave Pix do tipo ${type} foi cadastrada com sucesso.`,
    NotificationType.PIX_KEY
  );
} catch (notificationError) {
  console.error(
    "Erro ao criar notificação de cadastro de chave Pix:",
    notificationError
  );
}

    return res.status(201).json({
      success: true,
      message: "Chave Pix cadastrada com sucesso!",
      pixKey: {
        id: pixKey.id,
        type: pixKey.type,
        key: pixKey.key,
        createdAt: pixKey.createdAt,
      },
    });
  } catch (error) {
    console.error("Erro ao cadastrar chave Pix:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao cadastrar chave Pix.",
    });
  }
});


// Listar chaves Pix da conta
router.get("/pix-keys", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: req.userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Conta bancária não encontrada.",
      });
    }

    const pixKeys = await prisma.pixKey.findMany({
      where: {
        accountId: account.id,
      },
      select: {
        id: true,
        type: true,
        key: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Chaves Pix encontradas!",
      pixKeys,
    });
  } catch (error) {
    console.error("Erro ao consultar chaves Pix:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao consultar chaves Pix.",
    });
  }
});


// Excluir chave Pix
router.delete(
  "/pix-keys/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
    const id = req.params.id;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Identificador da chave Pix inválido.",
      });
    }

      const account = await prisma.account.findFirst({
        where: {
          userId: req.userId,
        },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Conta bancária não encontrada.",
        });
      }

      const pixKey = await prisma.pixKey.findFirst({
        where: {
          id,
          accountId: account.id,
        },
      });

      if (!pixKey) {
        return res.status(404).json({
          success: false,
          message: "Chave Pix não encontrada.",
        });
      }

      await prisma.pixKey.delete({
        where: {
          id: pixKey.id,
        },
      });

      // Criar notificação de exclusão de chave Pix
try {
  await createNotification(
    req.userId!,
    "Chave Pix excluída",
    `Sua chave Pix do tipo ${pixKey.type} foi excluída com sucesso.`,
    NotificationType.PIX_KEY
  );
} catch (notificationError) {
  console.error(
    "Erro ao criar notificação de exclusão de chave Pix:",
    notificationError
  );
}

      return res.status(200).json({
        success: true,
        message: "Chave Pix excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao excluir chave Pix:", error);

      return res.status(500).json({
        success: false,
        message: "Erro interno ao excluir chave Pix.",
      });
    }
  }
);

// Enviar dinheiro via Pix
router.post("/pix", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { key, amount } = req.body;

    // Validar chave Pix
    if (typeof key !== "string" || !key.trim()) {
      return res.status(400).json({
        success: false,
        message: "Informe a chave Pix do destinatário.",
      });
    }

    // Validar valor
    if (
      typeof amount !== "string" ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe um valor válido.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Localizar conta de origem
      const originAccount = await tx.account.findFirst({
        where: {
          userId: req.userId,
        },
      });

      if (!originAccount) {
        throw new Error("ORIGIN_ACCOUNT_NOT_FOUND");
      }

      // Localizar chave Pix do destinatário
      const pixKey = await tx.pixKey.findUnique({
        where: {
          key: key.trim(),
        },
        include: {
          account: true,
        },
      });

      if (!pixKey) {
        throw new Error("PIX_KEY_NOT_FOUND");
      }

      const destinationAccount = pixKey.account;

      // Impedir transferência para a própria conta
      if (originAccount.id === destinationAccount.id) {
        throw new Error("SAME_ACCOUNT");
      }

      // Validar valor e saldo disponível
      if (
        !validatePix(
        Number(amount),
        Number(originAccount.balance),
        originAccount.id,
        destinationAccount.id
  )
) {
  throw new Error("INSUFFICIENT_BALANCE");
}

      // Debitar o valor da conta de origem
      const debit = await tx.account.updateMany({
        where: {
          id: originAccount.id,
          balance: {
            gte: amount,
          },
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      if (debit.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Creditar a conta de destino
      await tx.account.update({
        where: {
          id: destinationAccount.id,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Registrar a transação no extrato
      const transaction = await tx.transaction.create({
        data: {
          type: "PIX",
          status: "COMPLETED",
          amount,
          description: "Transferência via Pix",
          fromAccountId: originAccount.id,
          toAccountId: destinationAccount.id,
        },
      });

      // Consultar saldo atualizado
      const updatedAccount = await tx.account.findUnique({
        where: {
          id: originAccount.id,
        },
      });

      return {
        transactionId: transaction.id,
        balance: updatedAccount!.balance,
        destinationAccount: destinationAccount.accountNumber,
        destinationUserId: destinationAccount.userId,
      };
    });

    // Criar notificações do Pix
    const formattedAmount = Number(amount).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    await createNotification(
      req.userId!,
      "Pix enviado",
      `Seu Pix de ${formattedAmount} foi enviado com sucesso para a conta ${result.destinationAccount}.`,
      NotificationType.PIX
    ).catch((error) => {
      console.error("Erro ao criar notificação de Pix enviado:", error);
    });

    await createNotification(
      result.destinationUserId,
      "Pix recebido",
      `Você recebeu um Pix de ${formattedAmount}.`,
      NotificationType.PIX
    ).catch((error) => {
      console.error("Erro ao criar notificação de Pix recebido:", error);
    });

    return res.status(200).json({
      success: true,
      message: "Pix realizado com sucesso!",
      pix: {
        transactionId: result.transactionId,
        destinationAccount: result.destinationAccount,
        amount,
        balance: result.balance,
      },
    });

  } catch (error) {
    console.error("Erro ao realizar Pix:", error);

    if (error instanceof Error) {
      const errors: Record<string, { status: number; message: string }> = {
        ORIGIN_ACCOUNT_NOT_FOUND: {
          status: 404,
          message: "Conta de origem não encontrada.",
        },
        PIX_KEY_NOT_FOUND: {
          status: 404,
          message: "Chave Pix não encontrada.",
        },
        SAME_ACCOUNT: {
          status: 400,
          message: "Não é possível enviar Pix para sua própria conta.",
        },
        INSUFFICIENT_BALANCE: {
          status: 409,
          message: "Saldo insuficiente para realizar o Pix.",
        },
      };

      const knownError = errors[error.message];

      if (knownError) {
        return res.status(knownError.status).json({
          success: false,
          message: knownError.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar Pix.",
    });
  }
});


// Transferência entre contas
router.post("/transfer", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { destinationAccount, amount } = req.body;

    // Validar número da conta de destino
    if (
      typeof destinationAccount !== "string" ||
      !/^\d{8}$/.test(destinationAccount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Número da conta de destino inválido.",
      });
    }

    // Validar valor da transferência
    if (
      typeof amount !== "string" ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      Number(amount) > 50000
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe um valor válido. O limite é R$ 50.000,00.",
      });
    }

    let result;

    // Tentar novamente em caso de conflito de concorrência
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {

            // Localizar conta de origem
            const originAccount = await tx.account.findFirst({
              where: {
                userId: req.userId,
              },
            });

            if (!originAccount) {
              throw new Error("ORIGIN_ACCOUNT_NOT_FOUND");
            }

            // Localizar conta de destino
            const targetAccount = await tx.account.findUnique({
              where: {
                accountNumber: destinationAccount,
              },
            });

            if (!targetAccount) {
              throw new Error("DESTINATION_ACCOUNT_NOT_FOUND");
            }

            // Impedir transferência para a própria conta
            if (originAccount.id === targetAccount.id) {
              throw new Error("SAME_ACCOUNT");
            }

            // Debitar conta de origem
            const debit = await tx.account.updateMany({
              where: {
                id: originAccount.id,
                balance: {
                  gte: amount,
                },
              },
              data: {
                balance: {
                  decrement: amount,
                },
              },
            });

            if (debit.count === 0) {
              throw new Error("INSUFFICIENT_BALANCE");
            }

            // Creditar conta de destino
            await tx.account.update({
              where: {
                id: targetAccount.id,
              },
              data: {
                balance: {
                  increment: amount,
                },
              },
            });

            // Registrar transferência
            const transaction = await tx.transaction.create({
              data: {
                type: "TRANSFER",
                status: "COMPLETED",
                amount,
                description: "Transferência bancária",
                fromAccountId: originAccount.id,
                toAccountId: targetAccount.id,
              },
            });

            // Consultar saldo atualizado
            const updatedAccount = await tx.account.findUnique({
              where: {
                id: originAccount.id,
              },
            });

            if (!updatedAccount) {
              throw new Error("ORIGIN_ACCOUNT_NOT_FOUND");
            }

            return {
              transactionId: transaction.id,
              destinationAccount: targetAccount.accountNumber,
              balance: updatedAccount.balance,
              destinationUserId: targetAccount.userId,
            };
          },
          {
            isolationLevel: "Serializable",
          }
        );

        // Transferência concluída
        break;

      } catch (error) {
        const errorCode =
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? error.code
            : undefined;

        // Repetir somente em conflitos de concorrência
        if (errorCode === "P2034" && attempt < 2) {
          continue;
        }

        throw error;
      }
    }

    if (!result) {
      throw new Error("TRANSFER_FAILED");
    }

    // Criar notificações
    const formattedAmount = Number(amount).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    await createNotification(
      req.userId!,
      "Transferência enviada",
      `Sua transferência de ${formattedAmount} para a conta ${result.destinationAccount} foi realizada com sucesso.`,
      NotificationType.TRANSFER
    ).catch((error) => {
      console.error("Erro ao criar notificação de transferência enviada:", error);
    });

    await createNotification(
      result.destinationUserId,
      "Transferência recebida",
      `Você recebeu uma transferência de ${formattedAmount}.`,
      NotificationType.TRANSFER
    ).catch((error) => {
      console.error("Erro ao criar notificação de transferência recebida:", error);
    });

    return res.status(200).json({
      success: true,
      message: "Transferência realizada com sucesso!",
      transfer: {
        transactionId: result.transactionId,
        destinationAccount: result.destinationAccount,
        amount,
        balance: result.balance,
      },
    });

  } catch (error) {
    console.error("Erro ao realizar transferência:", error);

    if (error instanceof Error) {
      const errors: Record<
        string,
        { status: number; message: string }
      > = {
        ORIGIN_ACCOUNT_NOT_FOUND: {
          status: 404,
          message: "Conta de origem não encontrada.",
        },
        DESTINATION_ACCOUNT_NOT_FOUND: {
          status: 404,
          message: "Conta de destino não encontrada.",
        },
        SAME_ACCOUNT: {
          status: 400,
          message: "Não é possível transferir para sua própria conta.",
        },
        INSUFFICIENT_BALANCE: {
          status: 409,
          message: "Saldo insuficiente para realizar a transferência.",
        },
      };

      const knownError = errors[error.message];

      if (knownError) {
        return res.status(knownError.status).json({
          success: false,
          message: knownError.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar transferência.",
    });
  }
});

export default router;