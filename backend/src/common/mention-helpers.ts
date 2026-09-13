import { PrismaService } from '../prisma/prisma.service';

export interface MentionUserMeta {
  username: string;
  fullName: string | null;
  isVerified: boolean;
}

export const MENTION_REGEX = /(?:^|[^\w@])@(?:\[([a-zA-Z0-9_]+)\]\([^)]+\)|([a-zA-Z0-9_]+))/g;

/**
 * Enriches posts with mentioned users' display metadata ({ username, fullName, isVerified })
 * Combines mentions tracked via MENTION_POST notifications as well as any in-content @username matches.
 */
export async function attachMentionedUsers<T extends { content?: string | null }>(
  prisma: PrismaService,
  posts: T[],
): Promise<(T & { mentions?: MentionUserMeta[] })[]> {
  if (!posts || posts.length === 0) return posts;

  const postIds = posts
    .map((p) => (p as any).id)
    .filter((id): id is number => typeof id === 'number');

  const notificationsByPostId = new Map<number, MentionUserMeta[]>();
  if (postIds.length > 0) {
    try {
      const mentionNotifs = await prisma.notification.findMany({
        where: {
          postId: { in: postIds },
          type: 'MENTION_POST',
        },
        select: {
          postId: true,
          recipient: {
            select: {
              username: true,
              fullName: true,
              isVerified: true,
            },
          },
        },
      });

      for (const notif of mentionNotifs) {
        if (notif.postId && notif.recipient) {
          const list = notificationsByPostId.get(notif.postId) || [];
          if (!list.some((u) => u.username.toLowerCase() === notif.recipient.username.toLowerCase())) {
            list.push(notif.recipient);
          }
          notificationsByPostId.set(notif.postId, list);
        }
      }
    } catch {
      // Ignore notification table lookup error
    }
  }

  // Also check for any @username or @[username](name) strings directly in content
  const regexUsernames = new Set<string>();
  const mentionRegex = /(?:^|[^\w@])@(?:\[([a-zA-Z0-9_]+)\]\([^)]+\)|([a-zA-Z0-9_]+))/g;

  for (const p of posts) {
    if (!p.content) continue;
    let m: RegExpExecArray | null;
    mentionRegex.lastIndex = 0;
    while ((m = mentionRegex.exec(p.content)) !== null) {
      const u = m[1] || m[2];
      if (u) regexUsernames.add(u.toLowerCase());
    }
  }

  const regexUserMap = new Map<string, MentionUserMeta>();
  if (regexUsernames.size > 0) {
    try {
      const users = await prisma.user.findMany({
        where: {
          username: { in: Array.from(regexUsernames), mode: 'insensitive' },
        },
        select: {
          username: true,
          fullName: true,
          isVerified: true,
        },
      });
      for (const u of users) {
        regexUserMap.set(u.username.toLowerCase(), u);
      }
    } catch {
      // Ignore
    }
  }

  const enrichedPosts = posts.map((p) => {
    const postId = (p as any).id;
    const postMentions: MentionUserMeta[] = [...(notificationsByPostId.get(postId) || [])];
    const seen = new Set(postMentions.map((m) => m.username.toLowerCase()));

    if (p.content) {
      let m: RegExpExecArray | null;
      mentionRegex.lastIndex = 0;
      while ((m = mentionRegex.exec(p.content)) !== null) {
        const u = (m[1] || m[2])?.toLowerCase();
        if (u && !seen.has(u)) {
          seen.add(u);
          const foundUser = regexUserMap.get(u);
          if (foundUser) {
            postMentions.push(foundUser);
          }
        }
      }
    }

    return { ...p, mentions: postMentions };
  });

  // Automatically enrich comments and replies if present on the posts
  for (const p of enrichedPosts) {
    if ((p as any).comments && Array.isArray((p as any).comments)) {
      (p as any).comments = await attachMentionedUsersToComments(prisma, (p as any).comments);
    }
  }

  return enrichedPosts;
}

/**
 * Enriches comments and nested replies with mentioned users' display metadata ({ username, fullName, isVerified })
 */
export async function attachMentionedUsersToComments<
  T extends { id: number; content: string; replies?: any[] }
>(
  prisma: PrismaService,
  comments: T[],
): Promise<(T & { mentions?: MentionUserMeta[]; replies?: any[] })[]> {
  if (!comments || comments.length === 0) return comments;

  // Flatten all comment IDs (both parent comments and replies)
  const allComments: { id: number; content: string }[] = [];
  for (const c of comments) {
    allComments.push({ id: c.id, content: c.content });
    if (c.replies && Array.isArray(c.replies)) {
      for (const r of c.replies) {
        allComments.push({ id: r.id, content: r.content });
      }
    }
  }

  const commentIds = allComments.map((c) => c.id);
  const notificationsByCommentId = new Map<number, MentionUserMeta[]>();

  if (commentIds.length > 0) {
    try {
      const mentionNotifs = await prisma.notification.findMany({
        where: {
          commentId: { in: commentIds },
          type: 'MENTION_COMMENT',
        },
        select: {
          commentId: true,
          recipient: {
            select: {
              username: true,
              fullName: true,
              isVerified: true,
            },
          },
        },
      });

      for (const notif of mentionNotifs) {
        if (notif.commentId && notif.recipient) {
          const list = notificationsByCommentId.get(notif.commentId) || [];
          if (!list.some((u) => u.username.toLowerCase() === notif.recipient.username.toLowerCase())) {
            list.push(notif.recipient);
          }
          notificationsByCommentId.set(notif.commentId, list);
        }
      }
    } catch {
      // Ignore notification table lookup error
    }
  }

  // Also extract any @username or @[username](name) strings directly from content
  const regexUsernames = new Set<string>();
  const mentionRegex = /(?:^|[^\w@])@(?:\[([a-zA-Z0-9_]+)\]\([^)]+\)|([a-zA-Z0-9_]+))/g;

  for (const item of allComments) {
    if (!item.content) continue;
    let m: RegExpExecArray | null;
    mentionRegex.lastIndex = 0;
    while ((m = mentionRegex.exec(item.content)) !== null) {
      const u = m[1] || m[2];
      if (u) regexUsernames.add(u.toLowerCase());
    }
  }

  const regexUserMap = new Map<string, MentionUserMeta>();
  if (regexUsernames.size > 0) {
    try {
      const users = await prisma.user.findMany({
        where: {
          username: { in: Array.from(regexUsernames), mode: 'insensitive' },
        },
        select: {
          username: true,
          fullName: true,
          isVerified: true,
        },
      });
      for (const u of users) {
        regexUserMap.set(u.username.toLowerCase(), u);
      }
    } catch {
      // Ignore
    }
  }

  function enrichItem<I extends { id: number; content: string }>(item: I): I & { mentions?: MentionUserMeta[] } {
    const list: MentionUserMeta[] = [...(notificationsByCommentId.get(item.id) || [])];
    const seen = new Set(list.map((m) => m.username.toLowerCase()));

    if (item.content) {
      let m: RegExpExecArray | null;
      mentionRegex.lastIndex = 0;
      while ((m = mentionRegex.exec(item.content)) !== null) {
        const u = (m[1] || m[2])?.toLowerCase();
        if (u && !seen.has(u)) {
          seen.add(u);
          const foundUser = regexUserMap.get(u);
          if (foundUser) {
            list.push(foundUser);
          }
        }
      }
    }

    return { ...item, mentions: list };
  }

  return comments.map((c) => {
    const enrichedComment = enrichItem(c);
    if (c.replies && Array.isArray(c.replies)) {
      enrichedComment.replies = c.replies.map((r) => enrichItem(r));
    }
    return enrichedComment;
  });
}

