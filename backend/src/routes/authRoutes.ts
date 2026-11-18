import { Router } from "express";

import {
  authMiddleware,
  type AuthRequest,
} from "../controllers/middlewares/authMiddleware.js";

import {
  register,
  login,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authControllers.js";

import { prisma } from "../config/prisma.js";

const router = Router();

// Cadastro e login
router.post("/register", register);
router.post("/login", login);

// Solicitar recuperação de senha
router.post("/forgot-password", requestPasswordReset);

// Redefinir senha utilizando token
router.post("/reset-password", resetPassword);

// Atualizar perfil
router.put("/profile", authMiddleware, updateProfile);

// Alterar senha
router.put("/change-password", authMiddleware, changePassword);

// Consultar usuário autenticado
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dados do usuário encontrados!",
      user,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao buscar dados do usuário.",
    });
  }
});

export default router;