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

const allowedOrigins = [
  "http://localhost:5173",
  "https://frontend-eduardo-akere.vercel.app",
  "https://frontend-alpha-henna-bbpds6rrf9.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
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