import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { generateUniquePostId } from '../common/id-generator';
import {
  attachMentionedUsers as attachMentionedUsersHelper,
  attachMentionedUsersToComments,
  MENTION_REGEX,
} from '../common/mention-helpers';

export type ReactionEvent = {
  postId: number;
  userId: number;
  type: string | null;
  liked: boolean;
  totalLikes: number;
  likes: { userId: number; type: string }[];
};

const postInclude = {
  author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
  comments: {
    where: { parentId: null },
    orderBy: { createdAt: 'asc' as const },
    take: 40,
    include: {
      author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
      likes: { select: { userId: true, type: true } },
      _count: { select: { likes: true, replies: true } },
      replies: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
          likes: { select: { userId: true, type: true } },
          _count: { select: { likes: true } },
        },
      },
    },
  },
  likes: { select: { userId: true, type: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

function normalizePost<T extends { imageUrl?: string | null; imageUrls?: string[] }>(post: T): T {
  if (!post) return post;
  if (!post.imageUrls || post.imageUrls.length === 0) {
    post.imageUrls = post.imageUrl ? [post.imageUrl] : [];
  } else {
    post.imageUrls = Array.from(new Set(post.imageUrls));
  }
  return post;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly reactionEvents$ = new Subject<ReactionEvent>();

  get reactionStream() {
    return this.reactionEvents$.asObservable();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    userId: number,
    content: string,
    imageUrls: string[],
    mentionedUsernames: string[] = [],
  ) {
    const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;
    const uniqueId = await generateUniquePostId(this.prisma);
    const post = await this.prisma.post.create({
      data: {
        id: uniqueId,
        authorId: userId,
        content: (content || '').trim(),
        imageUrl: primaryImage,
        imageUrls: imageUrls,
      },
      include: postInclude,
    });

    // Notify users mentioned with @username or selected in composer
    await this.handlePostMentions(userId, post.id, post.content, mentionedUsernames).catch(() => {});

    const [enriched] = await this.attachMentionedUsers([normalizePost(post)]);

    // Explicitly guarantee mentions are populated immediately from mentionedUsernames without delay
    if (mentionedUsernames.length > 0) {
      const explicitUsers = await this.prisma.user.findMany({
        where: {
          username: { in: mentionedUsernames, mode: 'insensitive' },
        },
        select: {
          username: true,
          fullName: true,
          isVerified: true,
        },
      });

      const existingUsernames = new Set((enriched.mentions || []).map((m) => m.username.toLowerCase()));
      const combined = [...(enriched.mentions || [])];
      for (const u of explicitUsers) {
        if (!existingUsernames.has(u.username.toLowerCase())) {
          combined.push(u);
          existingUsernames.add(u.username.toLowerCase());
        }
      }
      enriched.mentions = combined;
    }

    return enriched;
  }

  async findAll() {
    const posts = await this.prisma.post.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: postInclude,
    });
    const normalized = posts.map(normalizePost);
    return this.attachMentionedUsers(normalized);
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
    if (!post) throw new NotFoundException('Post not found');
    const [enriched] = await this.attachMentionedUsers([normalizePost(post)]);
    return enriched;
  }

  async addComment(
    userId: number,
    postId: number,
    content: string,
    parentId?: number,
    mentionedUsernames: string[] = [],
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
        likes: { select: { userId: true, type: true } },
        _count: { select: { likes: true, replies: true } },
        replies: {
          orderBy: { createdAt: 'asc' as const },
          include: {
            author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
            likes: { select: { userId: true, type: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parentComment && parentComment.authorId !== userId) {
        this.notifications.create({
          recipientId: parentComment.authorId,
          actorId: userId,
          type: 'REPLY_COMMENT',
          postId,
          commentId: comment.id,
          content: content.trim(),
        }).catch(() => {});
      }
    } else {
      if (post.authorId !== userId) {
        this.notifications.create({
          recipientId: post.authorId,
          actorId: userId,
          type: 'COMMENT_POST',
          postId,
          commentId: comment.id,
          content: content.trim(),
        }).catch(() => {});
      }
    }

    // Notify mentioned users with MENTION_COMMENT
    await this.handleCommentMentions(userId, postId, comment.id, content, mentionedUsernames).catch(() => {});

    // Immediately enrich returned comment with mentions metadata
    const [enriched] = await attachMentionedUsersToComments(this.prisma, [comment]);

    if (mentionedUsernames && mentionedUsernames.length > 0) {
      const explicitUsers = await this.prisma.user.findMany({
        where: {
          username: { in: mentionedUsernames, mode: 'insensitive' },
        },
        select: {
          username: true,
          fullName: true,
          isVerified: true,
        },
      });

      const existingUsernames = new Set(((enriched as any).mentions || []).map((m: any) => m.username.toLowerCase()));
      const combined = [...((enriched as any).mentions || [])];
      for (const u of explicitUsers) {
        if (!existingUsernames.has(u.username.toLowerCase())) {
          combined.push(u);
          existingUsernames.add(u.username.toLowerCase());
        }
      }
      (enriched as any).mentions = combined;
    }

    return enriched;
  }

  async getComments(postId: number) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
        likes: { select: { userId: true, type: true } },
        _count: { select: { likes: true, replies: true } },
        replies: {
          orderBy: { createdAt: 'asc' as const },
          include: {
            author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
            likes: { select: { userId: true, type: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });

    return attachMentionedUsersToComments(this.prisma, comments);
  }

  async toggleLike(userId: number, postId: number, reactionType = 'LIKE') {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    let result: { liked: boolean; type: string | null };
    if (existing) {
      if (!reactionType || existing.type === reactionType) {
        await this.prisma.like.delete({
          where: { userId_postId: { userId, postId } },
        });
        result = { liked: false, type: null };
      } else {
        const updated = await this.prisma.like.update({
          where: { userId_postId: { userId, postId } },
          data: { type: reactionType },
        });
        result = { liked: true, type: updated.type };
      }
    } else {
      const created = await this.prisma.like.create({
        data: { userId, postId, type: reactionType || 'LIKE' },
      });
      result = { liked: true, type: created.type };
    }

    if (result.liked && post.authorId !== userId) {
      this.notifications.create({
        recipientId: post.authorId,
        actorId: userId,
        type: 'LIKE_POST',
        postId: post.id,
        content: result.type,
      }).catch(() => {});
    } else if (!result.liked && post.authorId !== userId) {
      this.prisma.notification.deleteMany({
        where: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'LIKE_POST',
          postId: post.id,
          read: false,
        },
      }).catch(() => {});
    }

    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        _count: { select: { likes: true } },
        likes: { select: { userId: true, type: true } },
      },
    });

    const payload = {
      postId,
      userId,
      type: result.type,
      liked: result.liked,
      totalLikes: updatedPost?._count.likes ?? 0,
      likes: updatedPost?.likes ?? [],
    };

    this.reactionEvents$.next(payload);

    return payload;
  }

  async remove(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('You are only allowed to delete your own posts');
    }

    // Collect all media URLs before deleting the post record
    const imagesToDelete: string[] = [];
    if (post.imageUrl) imagesToDelete.push(post.imageUrl);
    if (Array.isArray(post.imageUrls)) {
      imagesToDelete.push(...post.imageUrls);
    }

    await this.prisma.post.delete({ where: { id: postId } });

    // Clean up images from Cloudinary
    if (imagesToDelete.length > 0) {
      try {
        await this.cloudinary.deleteImages(imagesToDelete);
      } catch (error) {
        this.logger.warn(`Failed to clean up Cloudinary assets for post ${postId}: ${error}`);
      }
    }

    return { success: true, id: postId };
  }

  async toggleBookmark(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { bookmarked: false, postId };
    } else {
      await this.prisma.bookmark.create({
        data: { userId, postId },
      });
      return { bookmarked: true, postId };
    }
  }

  async getBookmarks(userId: number) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: postInclude,
        },
      },
    });
    const normalized = bookmarks.map((b) => normalizePost(b.post));
    return this.attachMentionedUsers(normalized);
  }

  async getLikedPosts(userId: number) {
    const likes = await this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: postInclude,
        },
      },
    });
    const normalized = likes.map((l) => normalizePost(l.post));
    return this.attachMentionedUsers(normalized);
  }

  async getPostLikes(postId: number, currentUserId?: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const likes = await this.prisma.like.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
            location: true,
            _count: { select: { followers: true } },
            followers: currentUserId
              ? {
                  where: { followerId: currentUserId },
                  select: { followerId: true },
                }
              : false,
          },
        },
      },
    });

    return likes.map((l) => ({
      userId: l.userId,
      type: l.type,
      createdAt: l.createdAt,
      user: {
        id: l.user.id,
        username: l.user.username,
        fullName: l.user.fullName,
        avatarUrl: l.user.avatarUrl,
        bio: l.user.bio,
        isVerified: l.user.isVerified,
        location: l.user.location,
        followersCount: l.user._count?.followers ?? 0,
        isFollowing: Array.isArray(l.user.followers) && l.user.followers.length > 0,
      },
    }));
  }

  async toggleCommentLike(userId: number, commentId: number, reactionType = 'LIKE') {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    let result: { liked: boolean; type: string | null };

    if (existing) {
      if (existing.type === reactionType) {
        await this.prisma.commentLike.delete({
          where: { userId_commentId: { userId, commentId } },
        });
        result = { liked: false, type: null };
      } else {
        const updated = await this.prisma.commentLike.update({
          where: { userId_commentId: { userId, commentId } },
          data: { type: reactionType || 'LIKE' },
        });
        result = { liked: true, type: updated.type };
      }
    } else {
      const created = await this.prisma.commentLike.create({
        data: { userId, commentId, type: reactionType || 'LIKE' },
      });
      result = { liked: true, type: created.type };
    }

    if (result.liked && comment.authorId !== userId) {
      this.notifications.create({
        recipientId: comment.authorId,
        actorId: userId,
        type: 'LIKE_COMMENT',
        postId: comment.postId,
        commentId: comment.id,
        content: result.type,
      }).catch(() => {});
    } else if (!result.liked && comment.authorId !== userId) {
      this.prisma.notification.deleteMany({
        where: {
          recipientId: comment.authorId,
          actorId: userId,
          type: 'LIKE_COMMENT',
          commentId: comment.id,
          read: false,
        },
      }).catch(() => {});
    }

    const updatedComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        _count: { select: { likes: true } },
        likes: { select: { userId: true, type: true } },
      },
    });

    return {
      commentId,
      liked: result.liked,
      type: result.type,
      totalLikes: updatedComment?._count.likes ?? 0,
      likes: updatedComment?.likes ?? [],
    };
  }

  async getCommentLikes(commentId: number, currentUserId?: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const likes = await this.prisma.commentLike.findMany({
      where: { commentId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
            location: true,
            _count: { select: { followers: true } },
            followers: currentUserId
              ? {
                  where: { followerId: currentUserId },
                  select: { followerId: true },
                }
              : false,
          },
        },
      },
    });

    return likes.map((l) => ({
      userId: l.userId,
      type: l.type,
      createdAt: l.createdAt,
      user: {
        id: l.user.id,
        username: l.user.username,
        fullName: l.user.fullName,
        avatarUrl: l.user.avatarUrl,
        bio: l.user.bio,
        isVerified: l.user.isVerified,
        location: l.user.location,
        followersCount: l.user._count?.followers ?? 0,
        isFollowing: Array.isArray(l.user.followers) && l.user.followers.length > 0,
      },
    }));
  }

  /**
   * Returns trending topics strictly based on actual hashtags used in posts on this website.
   * Does NOT use internet fallbacks.
   */
  async getTrendingTags(limit = 10) {
    const posts = await this.prisma.post.findMany({
      select: { content: true },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    const counts: Record<string, number> = {};
    const tagRegex = /#([\w\u0080-\uffff]+)/g;

    for (const post of posts) {
      if (!post.content) continue;
      const matches = post.content.match(tagRegex);
      if (matches) {
        // Normalize to lowercase for counting, deduplicate multiple mentions within the same post
        const uniqueInPost = new Set(matches.map((m) => m.toLowerCase()));
        for (const tag of uniqueInPost) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(counts)
      .map(([tag, count]) => ({
        tag,
        label: tag.replace(/^#/, ''),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  /**
   * Suggested topics for creators when drafting a new post (distinct from website trending tags).
   */
  getSuggestedTags(limit = 10) {
    const suggestions = [
      'technology',
      'design',
      'photography',
      'art',
      'nature',
      'travel',
      'mindfulness',
      'startup',
      'innovation',
      'music',
      'community',
      'coding',
    ];
    return suggestions.slice(0, limit).map((label) => ({
      tag: `#${label}`,
      label,
    }));
  }

  /**
   * Extract user mentions (@username or @[username](name)) and deliver MENTION_POST notifications to valid recipients.
   */
  private async handlePostMentions(
    authorId: number,
    postId: number,
    content: string,
    explicitUsernames: string[] = [],
  ) {
    const mentionRegex = /(?:^|[^\w@])@(?:\[([a-zA-Z0-9_]+)\]\([^)]+\)|([a-zA-Z0-9_]+))/g;
    const matches: string[] = [...explicitUsernames];
    if (content) {
      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(content)) !== null) {
        const u = match[1] || match[2];
        if (u) {
          matches.push(u);
        }
      }
    }

    if (matches.length === 0) return;

    // Deduplicate mentioned usernames
    const uniqueUsernames = Array.from(new Set(matches.map((u) => u.toLowerCase())));

    try {
      const mentionedUsers = await this.prisma.user.findMany({
        where: {
          username: { in: uniqueUsernames, mode: 'insensitive' },
          id: { not: authorId },
        },
        select: { id: true, username: true },
      });

      const promises = mentionedUsers.map((recipient) =>
        this.notifications
          .create({
            recipientId: recipient.id,
            actorId: authorId,
            type: 'MENTION_POST',
            postId,
            content: content.trim().slice(0, 120),
          })
          .catch((err) => {
            this.logger.warn(`Failed to create mention notification for user ${recipient.id}: ${err}`);
          }),
      );
      await Promise.all(promises);
    } catch (err) {
      this.logger.error(`Error processing mentions for post ${postId}: ${err}`);
    }
  }

  /**
   * Extract user mentions in comments and deliver MENTION_COMMENT notifications.
   */
  private async handleCommentMentions(
    authorId: number,
    postId: number,
    commentId: number,
    content: string,
    explicitUsernames: string[] = [],
  ) {
    const mentionRegex = /(?:^|[^\w@])@(?:\[([a-zA-Z0-9_]+)\]\([^)]+\)|([a-zA-Z0-9_]+))/g;
    const matches: string[] = [...explicitUsernames];
    if (content) {
      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(content)) !== null) {
        const u = match[1] || match[2];
        if (u) {
          matches.push(u);
        }
      }
    }

    if (matches.length === 0) return;

    const uniqueUsernames = Array.from(new Set(matches.map((u) => u.toLowerCase())));

    try {
      const mentionedUsers = await this.prisma.user.findMany({
        where: {
          username: { in: uniqueUsernames, mode: 'insensitive' },
          id: { not: authorId },
        },
        select: { id: true, username: true },
      });

      const promises = mentionedUsers.map((recipient) =>
        this.notifications
          .create({
            recipientId: recipient.id,
            actorId: authorId,
            type: 'MENTION_COMMENT',
            postId,
            commentId,
            content: content.trim().slice(0, 120),
          })
          .catch((err) => {
            this.logger.warn(`Failed to create comment mention notification for user ${recipient.id}: ${err}`);
          }),
      );
      await Promise.all(promises);
    } catch (err) {
      this.logger.error(`Error processing mentions for comment ${commentId}: ${err}`);
    }
  }

  /**
   * Enrich posts with mentioned users metadata ({ username, fullName, isVerified })
   */
  async attachMentionedUsers<T extends { content?: string | null; comments?: any[] }>(posts: T[]) {
    const enrichedPosts = await attachMentionedUsersHelper(this.prisma, posts);
    for (const p of enrichedPosts) {
      if ((p as any).comments && Array.isArray((p as any).comments) && (p as any).comments.length > 0) {
        (p as any).comments = await attachMentionedUsersToComments(this.prisma, (p as any).comments);
      }
    }
    return enrichedPosts;
  }
}

