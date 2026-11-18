import { prisma } from "../config/prisma.js";
import { NotificationType } from "../../generated/prisma/client.js";

// Criar uma notificação
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
) {
  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
}

// Buscar notificações de um usuário
export async function getNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return {
    notifications,
    unreadCount,
  };
}

// Marcar uma notificação como lida
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  return await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

// Marcar todas as notificações como lidas
export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}