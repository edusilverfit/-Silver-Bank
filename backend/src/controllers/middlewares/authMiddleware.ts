import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  sub: string;
}

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Token de autenticação não informado.",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Formato de token inválido.",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      success: false,
      message: "Configuração de autenticação indisponível.",
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "silver-bank-api",
      audience: "silver-bank-users",
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token inválido.",
      });
    }

    const payload = decoded as TokenPayload;

    req.userId = payload.sub;

    return next();

  } catch {
    return res.status(401).json({
      success: false,
      message: "Token inválido ou expirado.",
    });
  }
}