import { prisma } from "../config/prisma.js";
import { SecurityActivityType } from "../../generated/prisma/client.js";

export async function createSecurityActivity(
  userId: string,
  type: SecurityActivityType,
  description: string
) {
  return await prisma.securityActivity.create({
    data: {
      userId,
      type,
      description,
    },
  });
}

export async function getSecurityActivities(userId: string) {
  return await prisma.securityActivity.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}