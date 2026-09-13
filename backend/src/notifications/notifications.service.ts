import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  recipientId: number;
  actorId: number;
  type: 'LIKE_POST' | 'LIKE_COMMENT' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'FOLLOW' | 'MENTION_POST' | 'MENTION_COMMENT';
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

    // For like/reaction actions, if an unread notification from the same actor already exists on the same item, update reaction type or avoid duplicate spam
    if (type === 'LIKE_POST' && postId) {
      const existing = await this.prisma.notification.findFirst({
        where: { recipientId, actorId, type, postId, read: false },
      });
      if (existing) {
        if (content && existing.content !== content) {
          return this.prisma.notification.update({
            where: { id: existing.id },
            data: { content, createdAt: new Date() },
            include: {
              actor: {
                select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true },
              },
              post: {
                select: { id: true, content: true, imageUrl: true, imageUrls: true },
              },
              comment: {
                select: { id: true, content: true },
              },
            },
          });
        }
        return existing;
      }
    } else if (type === 'LIKE_COMMENT' && commentId) {
      const existing = await this.prisma.notification.findFirst({
        where: { recipientId, actorId, type, commentId, read: false },
      });
      if (existing) {
        if (content && existing.content !== content) {
          return this.prisma.notification.update({
            where: { id: existing.id },
            data: { content, createdAt: new Date() },
            include: {
              actor: {
                select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true },
              },
              post: {
                select: { id: true, content: true, imageUrl: true, imageUrls: true },
              },
              comment: {
                select: { id: true, content: true },
              },
            },
          });
        }
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
        comment: {
          select: {
            id: true,
            content: true,
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
      if (params.type === 'MENTION_POST' || params.type === 'MENTIONS') {
        where.type = { in: ['MENTION_POST', 'MENTION_COMMENT'] };
      } else {
        where.type = params.type;
      }
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

    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        if ((item.type === 'LIKE_POST' || item.type === 'LIKE_COMMENT') && !item.content) {
          if (item.type === 'LIKE_POST' && item.postId) {
            const like = await this.prisma.like.findUnique({
              where: { userId_postId: { userId: item.actorId, postId: item.postId } },
              select: { type: true },
            });
            if (like?.type) {
              return { ...item, content: like.type };
            }
          } else if (item.type === 'LIKE_COMMENT' && item.commentId) {
            const commentLike = await this.prisma.commentLike.findUnique({
              where: { userId_commentId: { userId: item.actorId, commentId: item.commentId } },
              select: { type: true },
            });
            if (commentLike?.type) {
              return { ...item, content: commentLike.type };
            }
          }
        }
        return item;
      }),
    );

    return {
      items: resolvedItems,
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
