import { Response } from "express";
import type { AuthRequest } from "./middlewares/authMiddleware.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService.js";

// Buscar notificações
export async function listNotifications(
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

    const result = await getNotifications(userId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);

    return res.status(500).json({
      message: "Erro ao buscar notificações.",
    });
  }
}

// Marcar uma notificação como lida
export async function readNotification(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identificador de notificação inválido.",
      });
    }

    const result = await markNotificationAsRead(id, userId);

    if (result.count === 0) {
      return res.status(404).json({
        message: "Notificação não encontrada ou já lida.",
      });
    }

    return res.status(200).json({
      message: "Notificação marcada como lida.",
    });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);

    return res.status(500).json({
      message: "Erro ao atualizar notificação.",
    });
  }
}

// Marcar todas as notificações como lidas
export async function readAllNotifications(
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

    await markAllNotificationsAsRead(userId);

    return res.status(200).json({
      message: "Todas as notificações foram marcadas como lidas.",
    });
  } catch (error) {
    console.error("Erro ao atualizar notificações:", error);

    return res.status(500).json({
      message: "Erro ao atualizar notificações.",
    });
  }
}