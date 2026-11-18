import { Response } from "express";
import type { AuthRequest } from "./middlewares/authMiddleware.js";

import {
  getOrCreateVirtualCard,
  blockVirtualCard,
  unblockVirtualCard,
} from "../services/virtualCardService.js";

// Consultar cartão virtual
export async function getVirtualCard(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const card = await getOrCreateVirtualCard(userId);

    return res.status(200).json({ card });
  } catch (error) {
    console.error("Erro ao consultar cartão virtual:", error);

    return res.status(500).json({
      message: "Erro ao consultar cartão virtual.",
    });
  }
}

// Bloquear cartão virtual
export async function blockCard(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const card = await blockVirtualCard(userId);

    return res.status(200).json({
      message: "Cartão virtual bloqueado com sucesso.",
      card,
    });
  } catch (error) {
    console.error("Erro ao bloquear cartão virtual:", error);

    return res.status(500).json({
      message: "Erro ao bloquear cartão virtual.",
    });
  }
}

// Desbloquear cartão virtual
export async function unblockCard(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const card = await unblockVirtualCard(userId);

    return res.status(200).json({
      message: "Cartão virtual desbloqueado com sucesso.",
      card,
    });
  } catch (error) {
    console.error("Erro ao desbloquear cartão virtual:", error);

    return res.status(500).json({
      message: "Erro ao desbloquear cartão virtual.",
    });
  }
}