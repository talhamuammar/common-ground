import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  recipientId: number;
  actorId: number;
  type: 'LIKE_POST' | 'LIKE_COMMENT' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'FOLLOW';
  postId?: number | null;
  commentId?: number | null;
  content?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationDto) {
    const { recipientId, actorId, type, postId, commentId, content } = data;

    // Suppress notifications to oneself
    if (recipientId === actorId) {
      return null;
    }

    // For like actions, if an unread notification from the same actor already exists on the same item, avoid duplicate spam
    if (type === 'LIKE_POST' && postId) {
      const existing = await this.prisma.notification.findFirst({
        where: { recipientId, actorId, type, postId, read: false },
      });
      if (existing) {
        return existing;
      }
    } else if (type === 'LIKE_COMMENT' && commentId) {
      const existing = await this.prisma.notification.findFirst({
        where: { recipientId, actorId, type, commentId, read: false },
      });
      if (existing) {
        return existing;
      }
    }

    return this.prisma.notification.create({
      data: {
        recipientId,
        actorId,
        type,
        postId: postId ?? null,
        commentId: commentId ?? null,
        content: content ? content.trim().slice(0, 120) : null,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            imageUrls: true,
          },
        },
      },
    });
  }

  async findAll(
    userId: number,
    params?: {
      unreadOnly?: boolean;
      type?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = Math.min(params?.limit ?? 30, 100);
    const offset = params?.offset ?? 0;

    const where: any = {
      recipientId: userId,
    };

    if (params?.unreadOnly) {
      where.read = false;
    }

    if (params?.type && params.type !== 'ALL') {
      where.type = params.type;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          post: {
            select: {
              id: true,
              content: true,
              imageUrl: true,
              imageUrls: true,
            },
          },
          comment: {
            select: {
              id: true,
              content: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { recipientId: userId, read: false } }),
    ]);

    return {
      items,
      total,
      unreadCount,
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        read: false,
      },
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return { success: true, id: notificationId };
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  }

  async delete(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, id: notificationId };
  }
}
