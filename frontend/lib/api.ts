export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type PostComment = {
  id: number;
  content: string;
  createdAt: string;
  parentId?: number | null;
  author: { id: number; username: string; fullName?: string | null; avatarUrl: string | null; isVerified?: boolean };
  likes?: { userId: number; type?: string }[];
  replies?: PostComment[];
  _count?: { likes: number; replies?: number };
};

export type ReactionType = 'LIKE' | 'LOVE' | 'CELEBRATE' | 'LAUGH' | 'WOW' | 'SUPPORT';

export type Post = {
  id: number;
  content: string;
  imageUrl: string | null;
  imageUrls?: string[];
  createdAt: string;
  author: { id: number; username: string; fullName?: string | null; avatarUrl: string | null; isVerified?: boolean };
  comments?: PostComment[];
  likes?: { userId: number; type?: string }[];
  _count?: { comments: number; likes: number };
};

export type UserListItem = {
  id: number;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified?: boolean;
};

export type PublicProfile = {
  id: number;
  username: string;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  hometown: string | null;
  hometownLat: number | null;
  hometownLng: number | null;
  work: string | null;
  education: string | null;
  pronouns: string | null;
  relationship: string | null;
  languages: string | null;
  interests: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  instagram: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified?: boolean;
  createdAt: string;
  _count: { posts: number; followers: number; following: number; friends: number };
  posts: Post[];
  followersList?: UserListItem[];
  followingList?: UserListItem[];
  friendsList?: UserListItem[];
  friends?: UserListItem[];
};

export type Relationship = { isSelf: boolean; following: boolean; followedBy?: boolean; friend: boolean };

export type SuggestedUser = {
  id: number;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
  isVerified?: boolean;
};

export type SearchUserResult = {
  id: number;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
  _count?: {
    followers: number;
    posts: number;
  };
};

export type TrendingTag = {
  tag: string;
  label: string;
  count: number;
};

export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
