import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Silver Bank API funcionando!",
    status: "online",
  });
});

export default router;
