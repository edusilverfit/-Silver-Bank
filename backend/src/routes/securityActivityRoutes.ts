import { Router } from "express";
import { authMiddleware } from "../controllers/middlewares/authMiddleware.js";
import { listSecurityActivities } from "../controllers/securityActivityController.js";

const router = Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// Consultar histórico de atividades de segurança
router.get("/", listSecurityActivities);

export default router;