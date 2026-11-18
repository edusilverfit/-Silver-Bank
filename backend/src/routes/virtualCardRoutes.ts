import { Router } from "express";

import {
  getVirtualCard,
  blockCard,
  unblockCard,
} from "../controllers/VirtualCardController.js";

import { authMiddleware } from "../controllers/middlewares/authMiddleware.js";

const router = Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// Consultar cartão virtual
router.get("/", getVirtualCard);

// Bloquear cartão
router.patch("/block", blockCard);

// Desbloquear cartão
router.patch("/unblock", unblockCard);

export default router;