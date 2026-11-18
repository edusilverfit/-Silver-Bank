import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../config/prisma.js";

import { randomBytes, createHash } from "node:crypto";
import { sendPasswordResetEmail } from "./services/emailServices.js";

import { NotificationType } from "../../generated/prisma/client.js";
import { createNotification } from "../services/notificationService.js";

import { SecurityActivityType } from "../../generated/prisma/client.js";
import { createSecurityActivity } from "../services/securityActivityService.js";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    // Validar os campos
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Preencha todos os campos.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Os dados enviados são inválidos.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "A senha precisa ter pelo menos 8 caracteres.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Este e-mail já está cadastrado.",
      });
    }

    // Proteger a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário no banco
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Usuário cadastrado com sucesso!",
      user,
    });

  } catch (error) {
    console.error("Erro no cadastro:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao cadastrar usuário.",
    });
  }
}


export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validar os campos
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe um e-mail e uma senha válidos.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Procurar usuário no banco
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha incorretos.",
      });
    }

    // Comparar senha informada com o hash armazenado
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
  try {
    await createSecurityActivity(
      user.id,
      SecurityActivityType.FAILED_LOGIN,
      "Tentativa de login com senha incorreta."
    );
  } catch (activityError) {
    console.error(
      "Erro ao registrar tentativa de login:",
      activityError
    );
  }

  return res.status(401).json({
    success: false,
    message: "E-mail ou senha incorretos.",
  });
}

    // Verificar chave secreta
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET não configurado.");
    }

    // Gerar token
    const token = jwt.sign(
      { sub: user.id },
      secret,
      { expiresIn: "1d" }
    );

    try {
  await createSecurityActivity(
    user.id,
    SecurityActivityType.LOGIN,
    "Login realizado com sucesso."
  );
} catch (activityError) {
  console.error(
    "Erro ao registrar login:",
    activityError
  );
}

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao realizar login.",
    });
  }
}

export async function updateProfile(
  req: Request & { userId?: string },
  res: Response
) {
  try {
    const { name, email } = req.body;

    // Validar os campos
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe um nome e um e-mail válidos.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Informe um endereço de e-mail válido.",
      });
    }

    // Verificar se o e-mail pertence a outro usuário
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser && existingUser.id !== req.userId) {
      return res.status(409).json({
        success: false,
        message: "Este e-mail já está sendo utilizado.",
      });
    }

    // Atualizar os dados do usuário
    const updatedUser = await prisma.user.update({
      where: {
        id: req.userId,
      },
      data: {
        name: normalizedName,
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar perfil.",
    });
  }
}

export async function changePassword(
  req: Request & { userId?: string },
  res: Response
) {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar os campos
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe a senha atual e a nova senha.",
      });
    }

    // Validar tamanho da nova senha
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "A nova senha precisa ter pelo menos 8 caracteres.",
      });
    }

    // Buscar usuário autenticado
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado.",
      });
    }

    // Conferir senha atual
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "A senha atual está incorreta.",
      });
    }

    // Impedir reutilização da senha atual
    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "A nova senha deve ser diferente da atual.",
      });
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha no banco
    await prisma.user.update({
      where: {
        id: req.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Criar notificação de segurança
try {
  await createNotification(
    req.userId!,
    "Senha alterada",
    "Sua senha foi alterada com sucesso. Se você não realizou essa alteração, entre em contato com o suporte.",
    NotificationType.SECURITY
  );
  
} catch (notificationError) {
  console.error(
    "Erro ao criar notificação de alteração de senha:",
    notificationError
  );
}

// Registrar atividade de segurança
  try {
    await createSecurityActivity(
    req.userId!,
    SecurityActivityType.PASSWORD_CHANGED,
    "Senha da conta alterada com sucesso."
  );
} catch (activityError) {
  console.error(
    "Erro ao registrar alteração de senha:",
    activityError
  );
}

    return res.status(200).json({
      success: true,
      message: "Senha alterada com sucesso!",
    });

  } catch (error) {
    console.error("Erro ao alterar senha:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao alterar senha.",
    });
  }
}

export async function requestPasswordReset(
  req: Request,
  res: Response
) {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Informe um endereço de e-mail válido.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Não revelar se o e-mail está cadastrado
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
      });
    }

    // Invalidar tokens anteriores
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Gerar token aleatório
    const resetToken = randomBytes(32).toString("hex");

    // Armazenar somente o hash
    const tokenHash = createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Validade de 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL não configurada.");
    }

    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(
      user.email,
      user.name,
      resetLink
    );

    // Registrar solicitação de recuperação
try {
  await createSecurityActivity(
    user.id,
    SecurityActivityType.PASSWORD_RESET_REQUESTED,
    "Solicitação de recuperação de senha realizada."
  );
} catch (activityError) {
  console.error(
    "Erro ao registrar solicitação de recuperação:",
    activityError
  );
}

    return res.status(200).json({
      success: true,
      message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
    });

  } catch (error) {
    console.error("Erro ao solicitar recuperação:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível processar sua solicitação.",
    });
  }
}

export async function resetPassword(
  req: Request,
  res: Response
) {
  try {
    const { token, newPassword } = req.body;

    // Validar os campos
    if (
      typeof token !== "string" ||
      typeof newPassword !== "string" ||
      !token ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe o token e a nova senha.",
      });
    }

    // Validar tamanho da senha
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "A senha precisa ter pelo menos 8 caracteres.",
      });
    }

    // Gerar hash do token recebido
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // Procurar token no banco
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

    // Verificar validade
    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Link inválido ou expirado. Solicite uma nova recuperação.",
      });
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha e consumir token atomicamente
    await prisma.$transaction(async (tx) => {
      const tokenUpdate = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (tokenUpdate.count !== 1) {
        throw new Error("RESET_TOKEN_INVALID");
      }

      await tx.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      });
    });

    // Registrar conclusão da recuperação
try {
  await createSecurityActivity(
    resetToken.userId,
    SecurityActivityType.PASSWORD_RESET_COMPLETED,
    "Senha redefinida com sucesso por meio da recuperação de conta."
  );
} catch (activityError) {
  console.error(
    "Erro ao registrar conclusão da recuperação:",
    activityError
  );
}

    return res.status(200).json({
      success: true,
      message: "Senha redefinida com sucesso!",
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RESET_TOKEN_INVALID"
    ) {
      return res.status(400).json({
        success: false,
        message: "Link inválido ou expirado. Solicite uma nova recuperação.",
      });
    }

    console.error("Erro ao redefinir senha:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao redefinir senha.",
    });
  }
}