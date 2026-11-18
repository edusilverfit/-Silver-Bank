import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    await prisma.$connect();

    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Silver Bank conectado ao PostgreSQL!",
      database: "online",
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error);

    res.status(500).json({
      success: false,
      message: "Erro na conexão com o banco de dados.",
    });
  }
});

export default router;