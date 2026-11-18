import { Response } from "express";
import type { AuthRequest } from "./middlewares/authMiddleware.js";
import { getSecurityActivities } from "../services/securityActivityService.js";

export async function listSecurityActivities(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const activities = await getSecurityActivities(userId);

    return res.status(200).json({
      activities,
    });
  } catch (error) {
    console.error("Erro ao buscar atividades de segurança:", error);

    return res.status(500).json({
      message: "Erro ao consultar o histórico de segurança.",
    });
  }
}