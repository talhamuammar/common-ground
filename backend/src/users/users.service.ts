import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { attachMentionedUsers } from '../common/mention-helpers';

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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async publicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        location: true,
        locationLat: true,
        locationLng: true,
        hometown: true,
        hometownLat: true,
        hometownLng: true,
        work: true,
        education: true,
        pronouns: true,
        relationship: true,
        languages: true,
        interests: true,
        website: true,
        github: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        avatarUrl: true,
        coverUrl: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: postInclude,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Fetch followers and following to populate lists and compute mutual friends
    const [userFollowing, userFollowers] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: user.id },
        select: {
          following: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, bio: true, isVerified: true },
          },
        },
        take: 50,
      }),
      this.prisma.follow.findMany({
        where: { followingId: user.id },
        select: {
          follower: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, bio: true, isVerified: true },
          },
        },
        take: 50,
      }),
    ]);

    const followingList = userFollowing.map(f => f.following);
    const followersList = userFollowers.map(f => f.follower);
    const followingIdSet = new Set(followingList.map(u => u.id));
    const mutualFriends = followersList.filter(u => followingIdSet.has(u.id));

    const normalizedPosts = user.posts.map(p => {
      const copy = { ...p };
      if (!copy.imageUrls || copy.imageUrls.length === 0) {
        copy.imageUrls = copy.imageUrl ? [copy.imageUrl] : [];
      } else {
        copy.imageUrls = Array.from(new Set(copy.imageUrls));
      }
      return copy;
    });
    const enrichedPosts = await attachMentionedUsers(this.prisma, normalizedPosts);

    return {
      ...user,
      posts: enrichedPosts,
      followersList,
      followingList,
      friendsList: mutualFriends,
      friends: mutualFriends,
      _count: {
        ...user._count,
        friends: mutualFriends.length,
      },
    };
  }

  async getSuggestions(currentUserId?: number, limit = 10) {
    const users = await this.prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : undefined,
      take: limit,
      orderBy: [
        { followers: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        _count: { select: { followers: true, posts: true } },
        followers: currentUserId
          ? {
              where: { followerId: currentUserId },
              select: { followerId: true },
            }
          : false,
      },
    });

    return users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      followersCount: u._count.followers,
      postsCount: u._count.posts,
      isFollowing: Array.isArray(u.followers) && u.followers.length > 0,
    }));
  }

  async getMyConnections(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [followingListRaw, followersListRaw, suggestions] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: {
          following: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, bio: true, isVerified: true, location: true },
          },
        },
        take: 100,
      }),
      this.prisma.follow.findMany({
        where: { followingId: userId },
        select: {
          follower: {
            select: { id: true, username: true, fullName: true, avatarUrl: true, bio: true, isVerified: true, location: true },
          },
        },
        take: 100,
      }),
      this.getSuggestions(userId),
    ]);

    const following = followingListRaw.map((f) => f.following);
    const followers = followersListRaw.map((f) => f.follower);
    const followingSet = new Set(following.map((u) => u.id));
    const friends = followers.filter((u) => followingSet.has(u.id));

    return {
      friends,
      following,
      followers,
      suggestions,
    };
  }

  async relationship(userId: number, targetId: number) {
    await this.requireUser(targetId);
    if (userId === targetId) return { isSelf: true, following: false, followedBy: false, friend: false };
    const [following, followedBy] = await Promise.all([
      this.prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: targetId } } }),
      this.prisma.follow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: userId } } }),
    ]);
    const isFollowing = Boolean(following);
    const isFollowedBy = Boolean(followedBy);
    return {
      isSelf: false,
      following: isFollowing,
      followedBy: isFollowedBy,
      friend: isFollowing && isFollowedBy,
    };
  }

  async follow(userId: number, targetId: number) {
    this.assertDifferentUsers(userId, targetId);
    await this.requireUser(targetId);
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      create: { followerId: userId, followingId: targetId },
      update: {},
    });
    const followedBack = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: userId } },
    });

    this.notifications.create({
      recipientId: targetId,
      actorId: userId,
      type: 'FOLLOW',
    }).catch(() => {});

    return { following: true, friend: Boolean(followedBack) };
  }

  async unfollow(userId: number, targetId: number) {
    this.assertDifferentUsers(userId, targetId);
    await this.requireUser(targetId);
    await this.prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetId } });
    return { following: false, friend: false };
  }

  async addFriend(userId: number, targetId: number) {
    return this.follow(userId, targetId);
  }

  async removeFriend(userId: number, targetId: number) {
    return this.unfollow(userId, targetId);
  }

  async searchUsers(query: string, limit = 20) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: trimmed, mode: 'insensitive' } },
          { fullName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
    });
  }

  async getMediaPost(userId: number, type: 'avatar' | 'cover') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, fullName: true, avatarUrl: true, coverUrl: true, isVerified: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const targetUrl = type === 'avatar' ? user.avatarUrl : user.coverUrl;
    if (!targetUrl) throw new NotFoundException(`User has no ${type}`);

    const post = await this.prisma.post.findFirst({
      where: { authorId: userId, imageUrl: targetUrl },
      orderBy: { createdAt: 'desc' },
      include: postInclude,
    });

    if (!post) {
      throw new NotFoundException(`No post found for ${type}`);
    }

    const [enriched] = await attachMentionedUsers(this.prisma, [post]);
    return enriched;
  }

  private assertDifferentUsers(userId: number, targetId: number) {
    if (userId === targetId) throw new BadRequestException('You cannot perform this action on your own account');
  }

  private async requireUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }
}

