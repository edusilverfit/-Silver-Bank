import { randomInt } from "node:crypto";
import { prisma } from "../config/prisma.js";

export async function getOrCreateVirtualCard(userId: string) {
  // Verifica se o usuário já possui um cartão virtual
  const existingCard = await prisma.virtualCard.findUnique({
    where: { userId },
  });

  if (existingCard) {
    return existingCard;
  }

  // Busca o nome do titular
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  // Gera os últimos quatro dígitos fictícios
  const lastFour = String(randomInt(0, 10000)).padStart(4, "0");

  // Define validade demonstrativa de três anos
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 3);

  // Cria o cartão virtual
  const virtualCard = await prisma.virtualCard.create({
    data: {
      userId,
      lastFour,
      holderName: user.name,
      expiryMonth: expirationDate.getMonth() + 1,
      expiryYear: expirationDate.getFullYear(),
    },
  });

  return virtualCard;
}

// Bloqueia o cartão virtual do usuário
export async function blockVirtualCard(userId: string) {
  await getOrCreateVirtualCard(userId);

  return await prisma.virtualCard.update({
    where: { userId },
    data: {
      status: "BLOCKED",
    },
  });
}

// Desbloqueia o cartão virtual do usuário
export async function unblockVirtualCard(userId: string) {
  await getOrCreateVirtualCard(userId);

  return await prisma.virtualCard.update({
    where: { userId },
    data: {
      status: "ACTIVE",
    },
  });
}