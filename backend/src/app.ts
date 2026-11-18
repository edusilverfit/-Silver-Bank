import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import databaseRoutes from "./routes/databaseRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import securityActivityRoutes from "./routes/securityActivityRoutes.js";
import virtualCardRoutes from "./routes/virtualCardRoutes.js";



const app = express();

app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json());

// Rotas da API
app.use("/api/health", healthRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/security-activities", securityActivityRoutes);
app.use("/api/virtual-card", virtualCardRoutes);

export default app;