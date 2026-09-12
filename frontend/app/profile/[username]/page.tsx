'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { useAuthModal } from '../../../components/auth-modal';
import { ProfilePostList } from '../../../components/profile-post-list';
import { FullscreenPostModal } from '../../../components/post-modal';
import { FullscreenMediaModal } from '../../../components/media-modal';
import { UserAvatar } from '../../../components/user-avatar';
import { VerifiedBadge } from '../../../components/verified-badge';
import { LocationMapPreview } from '../../../components/location-map-preview';
import { FollowersModal } from '../../../components/followers-modal';
import { GithubIcon, TwitterXIcon, LinkedinIcon, InstagramIcon } from '../../../components/social-icons';
import { API_URL, mediaUrl, Post, PublicProfile, Relationship, SuggestedUser, UserListItem } from '../../../lib/api';
import { useReactionsSync } from '../../../lib/reactions-realtime';
import { broadcastFollowChange, SYNC_FOLLOW_EVENT, FollowChangeEvent } from '../../../lib/realtime';
import { parseWorkItems, parseEducationItems, formatWorkText, formatEducationText } from '../../../lib/work-study';
import {
  Briefcase, GraduationCap, MapPin, Globe, Heart, Calendar,
  Compass, User as UserIcon, Home, Languages, ExternalLink, Edit3, Lock,
  ChevronDown, ChevronRight, Check, Users, UserPlus, X, Link2, Camera, Loader2
} from 'lucide-react';

type ProfileTab = 'timeline' | 'about' | 'photos' | 'followers' | 'following' | 'friends';

function formatSocialUrl(kind: 'github' | 'twitter' | 'linkedin' | 'instagram', handleOrUrl: string) {
  if (!handleOrUrl) return '#';
  if (/^https?:\/\//i.test(handleOrUrl)) return handleOrUrl;
  const clean = handleOrUrl.replace(/^@/, '').trim();
  switch (kind) {
    case 'github': return `https://github.com/${clean}`;
    case 'twitter': return `https://x.com/${clean}`;
    case 'linkedin': return `https://linkedin.com/in/${clean}`;
    case 'instagram': return `https://instagram.com/${clean}`;
    default: return handleOrUrl;
  }
}

function formatWebsiteUrl(url: string) {
  if (!url) return '#';
  const clean = url.trim();
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

function formatWebsiteDisplay(url: string) {
  if (!url) return '';
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function renderBioWithMentions(bio: string) {
  const parts = bio.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const handle = part.slice(1);
      return (
        <Link
          key={i}
          href={`/profile/${handle}`}
          className="text-accent-fg hover:underline font-medium"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}

function UserGridList({
  title,
  description,
  emptyTitle,
  emptyDescription,
  users = [],
  badgeText,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  users?: UserListItem[];
  badgeText?: string;
}) {
  return (
    <div className="ultranet-card p-6">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3 gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-bold text-accent-fg border border-accent-subtle-border shrink-0 whitespace-nowrap">
          {users.length} {users.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {users.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {users.map(u => (
            <Link
              key={u.id}
              href={`/profile/${encodeURIComponent(u.username)}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3 transition-colors hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#151515]"
            >
              <UserAvatar
                src={mediaUrl(u.avatarUrl)}
                name={u.fullName || u.username}
                className="size-10 shrink-0 rounded-full text-xs font-semibold"
                sizes="40px"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <span>{u.fullName || u.username}</span>
                  {u.isVerified && <VerifiedBadge size={13} />}
                </p>
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">@{u.username}</p>
                {u.bio && <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{u.bio}</p>}
              </div>
              {badgeText && (
                <span className="shrink-0 text-[10px] font-semibold text-accent-fg bg-accent-subtle px-2 py-0.5 rounded border border-accent-subtle-border">
                  {badgeText}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
          <span className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-slate-100 dark:bg-[#151515] text-slate-400 dark:text-slate-500">👥</span>
          <p className="font-semibold text-slate-700 dark:text-slate-200">{emptyTitle}</p>
          <p className="mt-1 text-slate-400 dark:text-slate-500">{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const { token, user, ready, refresh } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('timeline');
  const [connectionsModal, setConnectionsModal] = useState<{ isOpen: boolean; tab: 'followers' | 'following' }>({
    isOpen: false,
    tab: 'following',
  });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'follow' | null>(null);
  const [error, setError] = useState('');

  // Cleanly close modal and clear any URL query param
  const handleCloseConnectionsModal = useCallback(() => {
    setConnectionsModal((prev) => ({ ...prev, isOpen: false }));
    if (typeof window !== 'undefined' && window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('modal') || url.searchParams.has('tab')) {
        url.searchParams.delete('modal');
        url.searchParams.delete('tab');
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, []);

  // Handle URL query to open followers/following modal
  useEffect(() => {
    const modalParam = searchParams.get('modal') || searchParams.get('tab');
    if (modalParam === 'followers') {
      setConnectionsModal({ isOpen: true, tab: 'followers' });
    } else if (modalParam === 'following') {
      setConnectionsModal({ isOpen: true, tab: 'following' });
    }
  }, [searchParams]);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [activePhotoModalPost, setActivePhotoModalPost] = useState<Post | null>(null);
  const [viewingMediaModal, setViewingMediaModal] = useState<{
    src: string;
    title: string;
    type: 'avatar' | 'cover';
  } | null>(null);
  const [isRemovingMedia, setIsRemovingMedia] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const measuredWidthsRef = useRef<Map<string, number>>(new Map());
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const allMediaPhotos = useMemo(() => {
    if (!profile?.posts) return [];
    const result: { url: string; post: Post; index: number }[] = [];
    for (const post of profile.posts) {
      const urls: string[] = (
        post.imageUrls && post.imageUrls.length > 0
          ? post.imageUrls
          : (post.imageUrl ? [post.imageUrl] : [])
      ).filter(Boolean);
      const uniqueUrls = Array.from(new Set(urls));
      uniqueUrls.forEach((url, index) => {
        result.push({ url, post, index });
      });
    }
    return result;
  }, [profile?.posts]);

  const photoCount = allMediaPhotos.length;

  const allTabsConfig = useMemo(() => [
    { id: 'timeline' as const, label: 'Timeline' },
    { id: 'about' as const, label: 'About' },
    { id: 'photos' as const, label: 'Photos', count: photoCount },
    { id: 'friends' as const, label: 'Friends', count: profile?._count?.friends, icon: Users },
  ], [photoCount, profile?._count?.friends]);

  const updateVisibleTabs = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Record newly measured button widths
    tabButtonRefs.current.forEach((btn, id) => {
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0) {
          measuredWidthsRef.current.set(id, rect.width);
        }
      }
    });

    const computed = window.getComputedStyle(nav);
    const padLeft = parseFloat(computed.paddingLeft) || 0;
    const padRight = parseFloat(computed.paddingRight) || 0;
    const gap = parseFloat(computed.gap) || (window.innerWidth >= 640 ? 32 : 24);
    const navAvailableWidth = nav.clientWidth - padLeft - padRight;

    if (navAvailableWidth <= 0) return;

    // Calculate total width if ALL tabs were rendered directly
    let totalAllWidth = 0;
    for (let i = 0; i < allTabsConfig.length; i++) {
      const tab = allTabsConfig[i];
      const w = measuredWidthsRef.current.get(tab.id) || (tab.label.length * 8 + (tab.count !== undefined ? 30 : 0) + 20);
      totalAllWidth += w + (i > 0 ? gap : 0);
    }

    // If all fit comfortably, show all and no More button
    if (totalAllWidth <= navAvailableWidth) {
      setVisibleCount(allTabsConfig.length);
      return;
    }

    // Otherwise, reserve space for the "More ▾" button (~85px)
    const moreBtnWidth = 85;
    const spaceForTabs = navAvailableWidth - moreBtnWidth - gap;

    let accumulated = 0;
    let count = 0;
    for (let i = 0; i < allTabsConfig.length; i++) {
      const tab = allTabsConfig[i];
      const w = measuredWidthsRef.current.get(tab.id) || (tab.label.length * 8 + (tab.count !== undefined ? 30 : 0) + 20);
      const needed = accumulated + w + (i > 0 ? gap : 0);
      if (needed <= spaceForTabs && count < allTabsConfig.length - 1) {
        accumulated = needed;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(2, count));
  }, [allTabsConfig]);

  useEffect(() => {
    updateVisibleTabs();

    const nav = navRef.current;
    if (!nav) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateVisibleTabs();
      });
      ro.observe(nav);
    }

    const onResize = () => updateVisibleTabs();
    window.addEventListener('resize', onResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [updateVisibleTabs]);

  // Who to follow suggestions state
  const [whoToFollow, setWhoToFollow] = useState<SuggestedUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});

  // Fetch "Who to follow" suggestions (filtering out profile user & self)
  useEffect(() => {
    let active = true;
    async function fetchSuggestions() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/users/suggestions`, { headers });
        if (!res.ok) return;
        const data: SuggestedUser[] = await res.json();
        if (active && Array.isArray(data)) {
          const filtered = data.filter((u) => u.id !== profile?.id && u.id !== user?.id);
          setWhoToFollow(filtered.slice(0, 5));
          const initialMap: Record<number, boolean> = {};
          data.forEach((u) => {
            initialMap[u.id] = u.isFollowing;
          });
          setFollowingMap(initialMap);
        }
      } catch {
        if (active) setWhoToFollow([]);
      }
    }
    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [profile?.id, token, user?.id]);

  async function handleToggleFollowSuggested(suggested: SuggestedUser) {
    if (!token) {
      openAuthModal({
        title: `Follow ${suggested.fullName || suggested.username}`,
        description: 'Sign up or log in to follow creators and build your personal feed.',
      });
      return;
    }
    const currentStatus = Boolean(followingMap[suggested.id]);
    const nextStatus = !currentStatus;
    const delta = nextStatus ? 1 : -1;
    setFollowingMap((prev) => ({ ...prev, [suggested.id]: nextStatus }));
    broadcastFollowChange(delta, suggested.id, nextStatus);

    try {
      const method = nextStatus ? 'POST' : 'DELETE';
      await fetch(`${API_URL}/users/${suggested.id}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setFollowingMap((prev) => ({ ...prev, [suggested.id]: currentStatus }));
      broadcastFollowChange(-delta, suggested.id, currentStatus);
    }
  }

  useEffect(() => {
    if (!moreMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreMenuOpen]);
  function handleOpenAvatarModal() {
    if (!profile?.avatarUrl) return;
    setViewingMediaModal({
      src: profile.avatarUrl,
      title: 'Profile picture',
      type: 'avatar',
    });
  }

  function handleOpenCoverModal() {
    if (!profile?.coverUrl) return;
    setViewingMediaModal({
      src: profile.coverUrl,
      title: 'Cover photo',
      type: 'cover',
    });
  }

  async function handleRemoveMedia(type: 'avatar' | 'cover') {
    if (!token || !profile) return;
    const isOwner = relationship?.isSelf || (user?.username === profile.username);
    if (!isOwner) return;
    setIsRemovingMedia(true);
    try {
      const res = await fetch(`${API_URL}/auth/me/${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProfile(prev => prev ? {
          ...prev,
          ...(type === 'avatar' ? { avatarUrl: null } : { coverUrl: null }),
        } : prev);
        await refresh();
        setViewingMediaModal(null);
      }
    } catch {
      // ignore
    } finally {
      setIsRemovingMedia(false);
    }
  }

  async function handleUploadDirect(kind: 'avatar' | 'cover', file: File) {
    if (!token || !profile || !file) return;
    const isOwner = relationship?.isSelf || (user?.username === profile.username);
    if (!isOwner) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Images must be 5 MB or smaller.');
      return;
    }

    if (kind === 'avatar') setIsUploadingAvatar(true);
    else setIsUploadingCover(true);

    const formData = new FormData();
    formData.append(kind, file);

    try {
      const res = await fetch(`${API_URL}/auth/me/${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const newUrl = kind === 'avatar' ? data.avatarUrl : data.coverUrl;
        setProfile(prev => prev ? {
          ...prev,
          ...(kind === 'avatar' ? { avatarUrl: newUrl } : { coverUrl: newUrl }),
        } : prev);
        await refresh();
        if (viewingMediaModal && viewingMediaModal.type === kind) {
          setViewingMediaModal(prev => prev ? { ...prev, src: newUrl } : null);
        }
      }
    } catch {
      // ignore
    } finally {
      if (kind === 'avatar') setIsUploadingAvatar(false);
      else setIsUploadingCover(false);
    }
  }

  const profileId = profile?.id;

  // Sync saved posts from DB bookmarks
  useEffect(() => {
    let active = true;
    if (!token) {
      setSavedPostIds([]);
      return;
    }
    fetch(`${API_URL}/posts/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setSavedPostIds(data.map((p: Post) => p.id));
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleToggleSave(postId: number) {
    if (!token) {
      openAuthModal({
        title: 'Save to your library',
        description: 'Sign up or log in to bookmark stories and photos to your personal collection.',
      });
      return;
    }
    const wasSaved = savedPostIds.includes(postId);
    const next = wasSaved
      ? savedPostIds.filter((id) => id !== postId)
      : [...savedPostIds, postId];
    setSavedPostIds(next);

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Bookmark toggle failed');
    } catch {
      setSavedPostIds((prev) =>
        wasSaved ? [...prev, postId] : prev.filter((id) => id !== postId),
      );
    }
  }

  // Live real-time reaction synchronization across profile posts & modal
  useReactionsSync(
    useCallback((event) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) => {
            if (p.id !== event.postId) return p;
            const nextLikes = event.likes || (
              event.liked
                ? [...(p.likes || []).filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
                : (p.likes || []).filter((l) => l.userId !== event.userId)
            );
            return {
              ...p,
              _count: {
                ...p._count,
                likes: event.totalLikes,
                comments: p._count?.comments ?? 0,
              },
              likes: nextLikes,
            };
          }),
        };
      });

      setActivePhotoModalPost((current) => {
        if (!current || current.id !== event.postId) return current;
        const nextLikes = event.likes || (
          event.liked
            ? [...(current.likes || []).filter((l) => l.userId !== event.userId), { userId: event.userId, type: event.type || 'LIKE' }]
            : (current.likes || []).filter((l) => l.userId !== event.userId)
        );
        return {
          ...current,
          _count: {
            ...current._count,
            likes: event.totalLikes,
            comments: current._count?.comments ?? 0,
          },
          likes: nextLikes,
        };
      });
    }, []),
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_URL}/users/by-username/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Profile not found' : 'Unable to load profile');
        return res.json() as Promise<PublicProfile>;
      })
      .then(setProfile)
      .catch((cause) => {
        if (cause.name !== 'AbortError') {
          setError(cause instanceof Error ? cause.message : 'Unable to load profile');
          setProfile(null);
        }
      })
      .finally(() => {
        // An aborted request may settle after a newer request has started.
        // It must not clear that request's loading state.
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [username]);

  useEffect(() => {
    if (!ready || !token || !profileId) { setRelationship(null); return; }
    const controller = new AbortController();
    fetch(`${API_URL}/users/${profileId}/relationship`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (res) => res.ok ? res.json() as Promise<Relationship> : null)
      .then(setRelationship)
      .catch(() => { });
    return () => controller.abort();
  }, [profileId, ready, token]);

  useEffect(() => {
    function handleFollowSync(e: Event) {
      const customEvent = e as CustomEvent<FollowChangeEvent>;
      if (customEvent.detail && profileId && customEvent.detail.targetUserId === profileId) {
        setRelationship((prev) => (prev ? { ...prev, following: customEvent.detail.following } : prev));
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            _count: {
              ...prev._count,
              followers: Math.max(0, prev._count.followers + customEvent.detail.delta),
            },
          };
        });
      }
    }
    window.addEventListener(SYNC_FOLLOW_EVENT, handleFollowSync);
    return () => window.removeEventListener(SYNC_FOLLOW_EVENT, handleFollowSync);
  }, [profileId]);

  async function handleFollowToggle() {
    if (!token) {
      openAuthModal({
        title: `Follow ${profile?.fullName || profile?.username || 'this user'}`,
        description: 'Sign up or log in to follow profiles and see their posts on your timeline.',
      });
      return;
    }
    if (!profile || relationship?.isSelf) return;
    setAction('follow');
    const currentlyFollowing = relationship?.following;
    try {
      const response = await fetch(`${API_URL}/users/${profile.id}/follow`, {
        method: currentlyFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Could not update relationship');
      const updated: Relationship = await response.json();
      setRelationship(updated);
      const delta = currentlyFollowing ? -1 : 1;
      broadcastFollowChange(delta, profile.id, !currentlyFollowing);
      setProfile((prev) => {
        if (!prev) return prev;
        const newCount = Math.max(0, prev._count.followers + delta);
        const friendsDelta = (updated.friend && !relationship?.friend) ? 1 : (!updated.friend && relationship?.friend) ? -1 : 0;
        return {
          ...prev,
          _count: {
            ...prev._count,
            followers: newCount,
            friends: Math.max(0, (prev._count.friends || 0) + friendsDelta),
          },
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not follow user');
    } finally {
      setAction(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-56px)] bg-[#f2f4f3] dark:bg-[#000000] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-[#151515]" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-[#151515]" />
            <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-[#151515] lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="m-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-8 shadow-xs text-slate-900 dark:text-slate-100">
        <h1 className="text-lg font-semibold">User not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error || 'This user does not exist or has been removed.'}</p>
        <Link href="/" className="mt-4 inline-flex font-semibold text-accent-fg hover:underline">Back to feed</Link>
      </div>
    );
  }

  const isSelf = relationship?.isSelf || (user?.username === profile.username);
  const avatar = mediaUrl(profile.avatarUrl);
  const cover = mediaUrl(profile.coverUrl);
  const joinedDate = new Date(profile.createdAt);
  const joinedMonth = joinedDate.toLocaleDateString('en-US', { month: 'long' });
  const joinedYear = joinedDate.getFullYear();
  const relationshipPending = Boolean(token && !isSelf && !relationship);

  // Parse comma-separated interests and languages
  const interestTags = profile.interests
    ? profile.interests.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const languageTags = profile.languages
    ? profile.languages.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Parse multiple work and education entries
  const workItems = parseWorkItems(profile.work);
  const educationItems = parseEducationItems(profile.education);

  return (
    <div className="min-h-[calc(100dvh-56px)] w-full bg-[#f2f4f3] dark:bg-[#000000] pb-12">
      {/* Cover and Profile Header Banner */}
      <div className="relative z-30 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d]">
        <div className="mx-auto max-w-[1320px] px-3 sm:px-5">
          <div className="rounded-xl bg-white dark:bg-[#0d0d0d] shadow-sm border border-slate-200/80 dark:border-white/[0.08]">
            {/* Cover Image */}
            <div className="relative group">
              <div
                onClick={cover ? handleOpenCoverModal : undefined}
                className={`relative h-44 sm:h-60 md:h-72 w-full overflow-hidden rounded-t-xl bg-accent dark:bg-[#080808] ${
                  cover ? 'cursor-pointer select-none' : ''
                }`}
                title={cover ? 'Click to view cover photo' : undefined}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-accent to-[#1c2733] opacity-90" />
                )}

                {/* Uploading indicator */}
                {isUploadingCover && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 text-white text-xs sm:text-sm font-medium z-10">
                    <Loader2 size={18} className="animate-spin text-accent-fg" />
                    <span>Uploading cover photo…</span>
                  </div>
                )}
              </div>

              {/* Edit/Add Cover Button for profile owner */}
              {isSelf && (
                <div className="absolute right-3 bottom-3 z-20">
                  <label
                    className="inline-flex items-center gap-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-white border border-white/20 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    title={cover ? 'Change cover photo' : 'Add cover photo'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Camera size={14} />
                    <span className="hidden sm:inline">{cover ? 'Edit cover photo' : 'Add cover photo'}</span>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={isUploadingCover}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadDirect('cover', file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Profile Info Row Under Cover */}
            <div className="relative px-4 pb-4 pt-3 sm:px-6">
              {/* Common Action Buttons Fragment */}
              {(() => {
                const actionButtons = isSelf ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-accent-text shadow-xs hover:bg-accent-hover transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Edit profile</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={action === 'follow' || relationshipPending}
                      className={`inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                        relationship?.following
                          ? 'border border-slate-300 dark:border-white/10 bg-white dark:bg-[#151515] text-slate-800 dark:text-slate-200 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400'
                          : 'bg-accent text-accent-text hover:bg-accent-hover'
                      }`}
                    >
                      {action === 'follow'
                        ? 'Updating…'
                        : relationship?.following
                          ? 'Following'
                          : 'Follow'}
                    </button>

                    <button
                      type="button"
                      disabled
                      title="Direct messaging is currently locked"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100/90 dark:bg-white/[0.05] px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed select-none opacity-85 shadow-xs whitespace-nowrap"
                    >
                      <Lock size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
                      <span>Message</span>
                    </button>
                  </div>
                );

                const followingFollowersRow = (
                  <div className="mt-3 sm:mt-3.5 flex items-center gap-6 sm:gap-7 text-sm sm:text-[15px]">
                    <button
                      type="button"
                      onClick={() => setConnectionsModal({ isOpen: true, tab: 'following' })}
                      className="inline-flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
                    >
                      <strong className="font-bold text-slate-900 dark:text-slate-100">
                        {(profile._count?.following ?? 0).toLocaleString()}
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        Following
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConnectionsModal({ isOpen: true, tab: 'followers' })}
                      className="inline-flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
                    >
                      <strong className="font-bold text-slate-900 dark:text-slate-100">
                        {(profile._count?.followers ?? 0).toLocaleString()}
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        Followers
                      </span>
                    </button>
                  </div>
                );

                const metadataItems = (
                  <div className="mt-2.5 sm:mt-3 flex items-center gap-x-4 gap-y-1.5 text-[15px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {profile.website && (
                      <a
                        href={formatWebsiteUrl(profile.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline transition-colors"
                      >
                        <Link2 size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="truncate max-w-[240px]">
                          {formatWebsiteDisplay(profile.website)}
                        </span>
                      </a>
                    )}
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                        <span>{profile.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                      <span>Joined {joinedMonth} {joinedYear}</span>
                    </span>
                  </div>
                );

                return (
                  <>
                    {/* Mobile Layout (< sm): Twitter-style presentation */}
                    <div className="sm:hidden space-y-2.5">
                      {/* Row 1: Avatar on left, Action buttons on top right */}
                      <div className="flex items-end justify-between gap-3">
                        <div className="relative -mt-12 size-20 shrink-0">
                          <div
                            onClick={avatar ? handleOpenAvatarModal : (isSelf ? () => avatarFileInputRef.current?.click() : undefined)}
                            className={`relative size-full rounded-2xl ring-4 ring-white dark:ring-[#0d0d0d] overflow-hidden bg-white dark:bg-[#151515] shadow-md ${
                              avatar ? 'cursor-pointer' : (isSelf ? 'cursor-pointer' : '')
                            }`}
                            title={avatar ? 'Click to view profile picture' : (isSelf ? 'Click to add profile picture' : undefined)}
                          >
                            <UserAvatar
                              src={avatar}
                              name={profile.fullName || profile.username}
                              shape="square"
                              className="size-full text-2xl font-bold"
                            />
                            {isUploadingAvatar && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                <Loader2 size={16} className="animate-spin text-white" />
                              </div>
                            )}
                          </div>

                          {isSelf && (
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-1 -right-1 z-20 grid size-7 place-items-center rounded-full bg-slate-900/90 hover:bg-black text-white shadow-md border-2 border-white dark:border-[#0d0d0d] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                              title="Change profile picture"
                            >
                              <Camera size={13} />
                              <input
                                ref={avatarFileInputRef}
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                disabled={isUploadingAvatar}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadDirect('avatar', file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Action buttons on top right */}
                        <div className="mb-0.5 shrink-0">
                          {actionButtons}
                        </div>
                      </div>

                      {/* Below Avatar: Name, Handle, Bio, Metadata, Following/Followers */}
                      <div className="pt-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h1 className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="truncate">{profile.fullName || profile.username}</span>
                            {profile.isVerified && <VerifiedBadge size={18} className="shrink-0" />}
                          </h1>
                          {profile.pronouns && (
                            <span className="rounded-full bg-slate-100 dark:bg-[#151515] px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 shrink-0">
                              {profile.pronouns}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[15px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          @{profile.username}
                        </p>

                        {/* Bio */}
                        {profile.bio && (
                          <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                            {renderBioWithMentions(profile.bio)}
                          </p>
                        )}

                        {/* Metadata: Location, Website, Joined Date */}
                        {metadataItems}

                        {/* Following & Followers row */}
                        {followingFollowersRow}
                      </div>
                    </div>

                    {/* Desktop & Tablet Layout (sm and up) */}
                    <div className="hidden sm:flex items-start justify-between gap-4 lg:gap-6">
                      <div className="flex items-start gap-3.5 sm:gap-4 lg:gap-5 min-w-0 flex-1">
                        <div className="relative -mt-14 sm:-mt-16 lg:-mt-20 size-24 sm:size-26 lg:size-32 shrink-0">
                          <div
                            onClick={avatar ? handleOpenAvatarModal : (isSelf ? () => avatarFileInputRef.current?.click() : undefined)}
                            className={`relative size-full rounded-2xl sm:rounded-[26px] ring-4 ring-white dark:ring-[#0d0d0d] overflow-hidden bg-white dark:bg-[#151515] shadow-md ${
                              avatar ? 'cursor-pointer' : (isSelf ? 'cursor-pointer' : '')
                            }`}
                            title={avatar ? 'Click to view profile picture' : (isSelf ? 'Click to add profile picture' : undefined)}
                          >
                            <UserAvatar
                              src={avatar}
                              name={profile.fullName || profile.username}
                              shape="square"
                              className="size-full text-2xl sm:text-2xl lg:text-3xl font-bold"
                            />
                            {isUploadingAvatar && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                <Loader2 size={22} className="animate-spin text-white" />
                              </div>
                            )}
                          </div>

                          {isSelf && (
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="absolute -bottom-1.5 -right-1.5 z-20 grid size-8 sm:size-9 place-items-center rounded-full bg-slate-900/90 hover:bg-black text-white shadow-lg border-2 border-white dark:border-[#0d0d0d] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                              title="Change profile picture"
                            >
                              <Camera size={15} />
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                disabled={isUploadingAvatar}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadDirect('avatar', file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>

                        <div className="pt-0.5 sm:pt-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span>{profile.fullName || profile.username}</span>
                              {profile.isVerified && <VerifiedBadge size={20} className="shrink-0" />}
                            </h1>
                            {profile.pronouns && (
                              <span className="rounded-full bg-slate-100 dark:bg-[#151515] px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 shrink-0">
                                {profile.pronouns}
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-sm sm:text-[15px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            @{profile.username}
                          </p>

                          {/* Bio */}
                          {profile.bio && (
                            <p className="mt-2.5 sm:mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line max-w-2xl">
                              {renderBioWithMentions(profile.bio)}
                            </p>
                          )}

                          {/* Metadata items: Location, Website, Joined Date */}
                          {metadataItems}

                          {/* Following & Followers row */}
                          {followingFollowersRow}
                        </div>
                      </div>

                      {/* Action buttons sitting where follower/followings previously were (top right) */}
                      <div className="self-start pt-1 sm:pt-1.5 pr-1 shrink-0">
                        {actionButtons}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Profile Navigation Tabs */}
            {(() => {
              const visibleTabs = allTabsConfig.slice(0, visibleCount);
              const moreTabs = allTabsConfig.slice(visibleCount);

              return (
                <nav
                  ref={navRef}
                  className="relative flex items-center gap-5 sm:gap-8 border-t border-slate-100 dark:border-white/[0.08] px-4 pt-3 sm:px-6 text-[15px] sm:text-sm lg:text-[15px] font-semibold text-slate-600 dark:text-slate-400 overflow-x-clip"
                >
                  {visibleTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          if (el) {
                            tabButtonRefs.current.set(tab.id, el);
                          } else {
                            tabButtonRefs.current.delete(tab.id);
                          }
                        }}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMoreMenuOpen(false);
                        }}
                        className={`relative pb-2.5 capitalize whitespace-nowrap transition-colors cursor-pointer text-[15px] sm:text-sm lg:text-[15px] ${
                          isActive
                            ? 'text-accent-fg font-bold after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-accent-fg'
                            : 'hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={`ml-1 text-xs sm:text-xs lg:text-[13px] ${isActive ? 'text-accent-fg font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                            ({tab.count})
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Dynamic "More" dropdown button: ONLY rendered when tabs do not fit */}
                  {moreTabs.length > 0 && (() => {
                    const isMoreActive = moreTabs.some((t) => t.id === activeTab);
                    const activeMoreItem = moreTabs.find((t) => t.id === activeTab);

                    return (
                      <div className="relative pb-2.5" ref={moreMenuRef}>
                        <button
                          type="button"
                          onClick={() => setMoreMenuOpen((prev) => !prev)}
                          className={`relative flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer text-[15px] sm:text-sm lg:text-[15px] ${
                            isMoreActive
                              ? 'text-accent-fg font-bold after:absolute after:bottom-[-10px] after:inset-x-0 after:h-0.5 after:bg-accent-fg'
                              : 'hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                          aria-expanded={moreMenuOpen}
                          aria-haspopup="true"
                        >
                          <span>
                            {activeMoreItem
                              ? `${activeMoreItem.label}${activeMoreItem.count !== undefined ? ` (${activeMoreItem.count})` : ''}`
                              : 'More'}
                          </span>
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${moreMenuOpen ? 'rotate-180 text-accent-fg' : ''}`}
                          />
                        </button>

                        {/* More Dropdown Menu */}
                        {moreMenuOpen && (
                          <>
                            {/* Backdrop overlay for mobile to tap outside */}
                            <div
                              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoreMenuOpen(false);
                              }}
                            />

                            <div
                              className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                              role="menu"
                            >
                              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/[0.06] mb-1.5">
                                <span>More sections</span>
                                <button
                                  type="button"
                                  onClick={() => setMoreMenuOpen(false)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                  aria-label="Close menu"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <div className="space-y-1">
                                {moreTabs.map((item) => {
                                  const isSelected = activeTab === item.id;
                                  const TabIcon = item.icon || Users;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setActiveTab(item.id);
                                        setMoreMenuOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-accent text-accent-text font-bold shadow-2xs'
                                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <TabIcon size={14} className={isSelected ? 'text-accent-text' : 'text-slate-400'} />
                                        <span>{item.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {item.count !== undefined && (
                                          <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                              isSelected
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400'
                                            }`}
                                          >
                                            {item.count}
                                          </span>
                                        )}
                                        {isSelected && <Check size={14} className="shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </nav>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3-Column Content Layout */}
      <div className={`mx-auto grid max-w-[1320px] grid-cols-1 gap-5 px-3 pt-5 sm:px-5 lg:grid-cols-[280px_minmax(0,1fr)] ${
        allMediaPhotos.length > 0 || whoToFollow.length > 0
          ? 'xl:grid-cols-[300px_minmax(0,1fr)_280px]'
          : 'xl:grid-cols-[300px_minmax(0,1fr)]'
      }`}>
        {/* Left Column Widgets */}
        <div className={`space-y-4 order-1 lg:order-1 xl:order-1 ${activeTab === 'timeline' ? 'block' : 'hidden lg:block'}`}>
          {/* Enhanced Introduction / About Highlights Card */}
          <div className="ultranet-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">About</h2>
              {isSelf && (
                <Link href="/settings/profile" className="text-xs font-semibold text-accent-fg hover:underline">
                  Edit
                </Link>
              )}
            </div>

            <ul className="mt-3 space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
              {workItems.map((item, idx) => (
                <li key={`sb-work-${idx}`} className="flex items-start gap-2.5">
                  <Briefcase className="size-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-snug text-slate-700 dark:text-slate-200">
                    {item.position && item.name ? (
                      <>
                        {!item.isCurrent && <span className="text-slate-500 dark:text-slate-400">Former </span>}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.position}</span>
                        <span className="text-slate-500 dark:text-slate-400"> at </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatWorkText(item)}
                      </span>
                    )}
                  </span>
                </li>
              ))}

              {educationItems.map((item, idx) => (
                <li key={`sb-edu-${idx}`} className="flex items-start gap-2.5">
                  <GraduationCap className="size-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-snug text-slate-700 dark:text-slate-200">
                    {item.subject && item.name ? (
                      <>
                        <span className="text-slate-500 dark:text-slate-400">
                          {item.isCurrent ? 'Studies ' : 'Studied '}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.subject}</span>
                        <span className="text-slate-500 dark:text-slate-400"> at </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatEducationText(item)}
                      </span>
                    )}
                  </span>
                </li>
              ))}

              {/* Followed by (Positioned above location, matching text-sm font size) */}
              <li className="flex items-center gap-2.5">
                <Users className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-left text-sm text-slate-600 dark:text-slate-300">
                  <span>Followed by </span>
                  <button
                    type="button"
                    onClick={() => setConnectionsModal({ isOpen: true, tab: 'followers' })}
                    className="font-bold text-slate-800 dark:text-slate-100 hover:text-accent-fg hover:underline transition-colors cursor-pointer"
                  >
                    {(profile._count?.followers ?? 0).toLocaleString()}{' '}
                    {profile._count?.followers === 1 ? 'person' : 'people'}
                  </button>
                </span>
              </li>

              {profile.location && (
                <li className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Lives in <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.location}</span></span>
                  </div>
                  {/* Mini Map Thumbnail in Sidebar */}
                  <LocationMapPreview
                    location={profile.location}
                    lat={null}
                    lng={null}
                    heightClass="h-28"
                    showDetails={false}
                  />
                </li>
              )}

              {profile.hometown && (
                <li className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Home className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>From <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.hometown}</span></span>
                  </div>
                  {/* Mini Map Thumbnail for Hometown in Sidebar */}
                  <LocationMapPreview
                    location={profile.hometown}
                    lat={null}
                    lng={null}
                    icon="home"
                    color="amber"
                    label="Hometown"
                    heightClass="h-28"
                    showDetails={false}
                  />
                </li>
              )}

              {profile.relationship && (
                <li className="flex items-center gap-2.5">
                  <Heart className="size-4 text-rose-400 shrink-0" />
                  <span>Status: <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.relationship}</span></span>
                </li>
              )}

              {languageTags.length > 0 && (
                <li className="flex items-start gap-2.5">
                  <Languages className="size-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {languageTags.map(lang => (
                      <span key={lang} className="rounded bg-slate-100 dark:bg-[#151515] px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {lang}
                      </span>
                    ))}
                  </div>
                </li>
              )}

              {/* Social Media Link Icons */}
              {(profile.github || profile.twitter || profile.linkedin || profile.instagram || profile.website) && (
                <li className="pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-2 flex-wrap">
                  {profile.website && (
                    <a href={formatWebsiteUrl(profile.website)} target="_blank" rel="noreferrer" title="Website" className="grid size-7.5 place-items-center rounded-lg bg-slate-100 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                      <Link2 size={14} />
                    </a>
                  )}
                  {profile.github && (
                    <a href={formatSocialUrl('github', profile.github)} target="_blank" rel="noreferrer" title="GitHub" className="grid size-7.5 place-items-center rounded-lg bg-slate-100 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-accent-subtle hover:text-accent-fg transition-colors">
                      <GithubIcon size={14} />
                    </a>
                  )}
                  {profile.twitter && (
                    <a href={formatSocialUrl('twitter', profile.twitter)} target="_blank" rel="noreferrer" title="Twitter / X" className="grid size-7.5 place-items-center rounded-lg bg-slate-100 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-accent-subtle hover:text-accent-fg transition-colors">
                      <TwitterXIcon size={14} />
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={formatSocialUrl('linkedin', profile.linkedin)} target="_blank" rel="noreferrer" title="LinkedIn" className="grid size-7.5 place-items-center rounded-lg bg-slate-100 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-accent-subtle hover:text-accent-fg transition-colors">
                      <LinkedinIcon size={14} />
                    </a>
                  )}
                  {profile.instagram && (
                    <a href={formatSocialUrl('instagram', profile.instagram)} target="_blank" rel="noreferrer" title="Instagram" className="grid size-7.5 place-items-center rounded-lg bg-slate-100 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-accent-subtle hover:text-accent-fg transition-colors">
                      <InstagramIcon size={14} />
                    </a>
                  )}
                </li>
              )}

              <li className="flex items-center gap-2.5 pt-1 text-sm text-slate-600 dark:text-slate-300">
                <Calendar className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>
                  Member since <strong className="font-bold text-slate-900 dark:text-slate-100">{joinedMonth} {joinedYear}</strong>
                </span>
              </li>
            </ul>
          </div>

          {/* User Community Stats Card */}
          <div className="ultranet-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 pb-3">Activity</h2>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`rounded-lg p-2.5 transition-all text-center ${activeTab === 'timeline' ? 'bg-accent text-accent-text shadow-xs' : 'bg-accent-subtle text-slate-700 dark:text-slate-300 hover:bg-accent-subtle-hover'}`}
              >
                <p className={`text-lg font-bold ${activeTab === 'timeline' ? 'text-accent-text' : 'text-accent-fg'}`}>{profile._count.posts}</p>
                <p className={`text-xs font-medium ${activeTab === 'timeline' ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>Posts</p>
              </button>
              <button
                type="button"
                onClick={() => setConnectionsModal({ isOpen: true, tab: 'followers' })}
                className="rounded-lg p-2.5 transition-all text-center bg-accent-subtle text-slate-700 dark:text-slate-300 hover:bg-accent-subtle-hover cursor-pointer"
              >
                <p className="text-lg font-bold text-accent-fg">{profile._count.followers}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Followers</p>
              </button>
              <button
                type="button"
                onClick={() => setConnectionsModal({ isOpen: true, tab: 'following' })}
                className="rounded-lg p-2.5 transition-all text-center bg-accent-subtle text-slate-700 dark:text-slate-300 hover:bg-accent-subtle-hover cursor-pointer"
              >
                <p className="text-lg font-bold text-accent-fg">{profile._count.following}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Following</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`rounded-lg p-2.5 transition-all text-center ${activeTab === 'friends' ? 'bg-accent text-accent-text shadow-xs' : 'bg-accent-subtle text-slate-700 dark:text-slate-300 hover:bg-accent-subtle-hover'}`}
              >
                <p className={`text-lg font-bold ${activeTab === 'friends' ? 'text-accent-text' : 'text-accent-fg'}`}>{profile._count.friends}</p>
                <p className={`text-xs font-medium ${activeTab === 'friends' ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>Friends</p>
              </button>
            </div>
          </div>
        </div>

        {/* Center Feed / Tab Panels Column */}
        <div className="space-y-4 min-w-0 order-3 lg:order-2 xl:order-2">
          {activeTab === 'timeline' && (
            <ProfilePostList
              posts={profile.posts}
              savedPostIds={savedPostIds}
              onToggleSave={handleToggleSave}
              onPostDeleted={(deletedId) => {
                setProfile(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    posts: prev.posts.filter(p => p.id !== deletedId),
                    _count: {
                      ...prev._count,
                      posts: Math.max(0, prev._count.posts - 1),
                    },
                  };
                });
              }}
            />
          )}

          {activeTab === 'photos' && (
            <div className="ultranet-card p-6">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Photos by {profile.fullName || profile.username}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Visual moments and media shared in posts.</p>
              {allMediaPhotos.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {allMediaPhotos.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.post.id}-${idx}`}
                      onClick={() => setActivePhotoModalPost(item.post)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-[#151515] border border-slate-200/60 dark:border-white/[0.08] cursor-pointer text-left transition-all hover:opacity-95"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(item.url)!}
                        alt="Shared media"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-10 text-xs text-slate-400 dark:text-slate-500">No photos uploaded yet.</p>
              )}
            </div>
          )}

          {/* Comprehensive About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              {/* 1. Overview & Bio Card */}
              <div className="ultranet-card p-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-accent-fg" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Personal Overview</h2>
                  </div>
                  {isSelf && (
                    <Link href="/settings/profile" className="flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline">
                      <Edit3 size={12} /> Edit
                    </Link>
                  )}
                </div>

                <div className="mt-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Display Name</dt>
                      <dd className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{profile.fullName || profile.username}</span>
                        {profile.isVerified && <VerifiedBadge size={14} />}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Username</dt>
                      <dd className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">@{profile.username}</dd>
                    </div>
                    {profile.pronouns && (
                      <div>
                        <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Pronouns</dt>
                        <dd className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">{profile.pronouns}</dd>
                      </div>
                    )}
                    {profile.relationship && (
                      <div>
                        <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Relationship Status</dt>
                        <dd className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">{profile.relationship}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Followed by</dt>
                      <dd className="mt-1 text-sm sm:text-[15px] text-slate-800 dark:text-slate-100">
                        <button
                          type="button"
                          onClick={() => setConnectionsModal({ isOpen: true, tab: 'followers' })}
                          className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer group"
                        >
                          {profile.followersList && profile.followersList.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {profile.followersList.slice(0, 3).map((f) => (
                                <UserAvatar
                                  key={f.id}
                                  src={mediaUrl(f.avatarUrl)}
                                  name={f.fullName || f.username}
                                  className="size-5.5 rounded-full ring-1.5 ring-white dark:ring-[#151515] object-cover shrink-0"
                                  sizes="22px"
                                />
                              ))}
                            </div>
                          )}
                          <span className="font-semibold text-accent-fg group-hover:underline">
                            {(profile._count?.followers ?? 0).toLocaleString()}{' '}
                            {profile._count?.followers === 1 ? 'person' : 'people'}
                          </span>
                        </button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">Member Since</dt>
                      <dd className="mt-1 text-sm sm:text-[15px] text-slate-800 dark:text-slate-100">
                        <strong className="font-bold text-slate-900 dark:text-white">{joinedMonth} {joinedYear}</strong>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 2. Places & Interactive Location Maps Card */}
              <div className="ultranet-card p-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-accent-fg" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Places & Locations</h2>
                  </div>
                  {isSelf && (
                    <Link href="/settings/profile" className="text-xs font-semibold text-accent-fg hover:underline">
                      Edit places →
                    </Link>
                  )}
                </div>

                <div className="mt-4 space-y-6">
                  {/* Location Meta Badges */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50/70 dark:bg-[#151515] p-3.5 border border-slate-200/60 dark:border-white/[0.06]">
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <MapPin size={14} className="text-accent-fg shrink-0" />
                        Current Living Location
                      </span>
                      <p className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                        <span>{profile.location || 'Not specified'}</span>
                      </p>
                    </div>
                    {profile.hometown && (
                      <div className="rounded-xl bg-slate-50/70 dark:bg-[#151515] p-3.5 border border-slate-200/60 dark:border-white/[0.06]">
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <Home size={14} className="text-amber-500 shrink-0" />
                          Hometown & Origin
                        </span>
                        <p className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                          <span>{profile.hometown}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dual Interactive Maps */}
                  {(profile.location || profile.hometown) ? (
                    <div className="space-y-6">
                      {/* Current Location Map */}
                      {profile.location && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin size={14} className="text-accent-fg" />
                              <span>Current Location: <strong className="text-slate-900 dark:text-white font-semibold">{profile.location}</strong></span>
                            </p>
                            <span className="text-xs font-semibold text-accent-fg bg-accent-subtle border border-accent-subtle-border rounded-full px-2.5 py-0.5">
                              Living Here
                            </span>
                          </div>
                          <LocationMapPreview
                            location={profile.location}
                            lat={null}
                            lng={null}
                            label="Current Living Location"
                            icon="pin"
                            color="emerald"
                            heightClass="h-56"
                            showDetails={true}
                          />
                        </div>
                      )}

                      {/* Hometown Map */}
                      {profile.hometown && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Home size={14} className="text-amber-500" />
                              <span>Hometown & Origin: <strong className="text-slate-900 dark:text-white font-semibold">{profile.hometown}</strong></span>
                            </p>
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                              Hometown
                            </span>
                          </div>
                          <LocationMapPreview
                            location={profile.hometown}
                            lat={null}
                            lng={null}
                            label="Hometown / Place of Origin"
                            icon="home"
                            color="amber"
                            heightClass="h-56"
                            showDetails={true}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      <MapPin size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p>No locations added yet.</p>
                      {isSelf && (
                        <Link href="/settings/profile" className="mt-2 inline-block font-semibold text-accent-fg hover:underline">
                          Add location →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Work & Education Card */}
              {(workItems.length > 0 || educationItems.length > 0) && (
                <div className="ultranet-card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-accent-fg" />
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Work & Education</h2>
                    </div>
                    {isSelf && (
                      <Link href="/settings/profile" className="text-xs font-semibold text-accent-fg hover:underline">
                        Edit work & education →
                      </Link>
                    )}
                  </div>

                  <div className="mt-5 space-y-6">
                    {/* Work Experience */}
                    {workItems.length > 0 && (
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                          <Briefcase size={14} className="text-accent-fg" />
                          <span>Work Experience ({workItems.length})</span>
                        </span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {workItems.map((item, idx) => (
                            <div
                              key={`about-work-${idx}`}
                              className="rounded-xl bg-slate-50 dark:bg-[#151515] p-3.5 border border-slate-200/60 dark:border-white/[0.06] flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                  <Briefcase size={13} className="text-accent-fg" />
                                  <span>{item.isCurrent ? 'Current Position' : 'Past Experience'}</span>
                                </span>
                                <p className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                                  {formatWorkText(item)}
                                </p>
                              </div>
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                  item.isCurrent
                                    ? 'bg-accent-subtle text-accent-fg border-accent-subtle-border'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-slate-400 dark:border-white/10'
                                }`}
                              >
                                {item.isCurrent ? 'Present' : 'Past'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education & Studies */}
                    {educationItems.length > 0 && (
                      <div className={workItems.length > 0 ? 'pt-4 border-t border-slate-100 dark:border-white/[0.06]' : ''}>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                          <GraduationCap size={15} className="text-accent-fg" />
                          <span>Education & Studies ({educationItems.length})</span>
                        </span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {educationItems.map((item, idx) => (
                            <div
                              key={`about-edu-${idx}`}
                              className="rounded-xl bg-slate-50 dark:bg-[#151515] p-3.5 border border-slate-200/60 dark:border-white/[0.06] flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                  <GraduationCap size={13} className="text-accent-fg" />
                                  <span>{item.isCurrent ? 'Currently Studying' : 'Past Study'}</span>
                                </span>
                                <p className="mt-1 text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                                  {formatEducationText(item)}
                                </p>
                              </div>
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                  item.isCurrent
                                    ? 'bg-accent-subtle text-accent-fg border-accent-subtle-border'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-slate-400 dark:border-white/10'
                                }`}
                              >
                                {item.isCurrent ? 'Present' : 'Past'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Interests & Languages Card */}
              {(interestTags.length > 0 || languageTags.length > 0) && (
                <div className="ultranet-card p-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.08] pb-3">
                    <Compass size={16} className="text-accent-fg" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Interests & Languages</h2>
                  </div>

                  <div className="mt-4 space-y-4">
                    {interestTags.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-2">Interests & Hobbies</span>
                        <div className="flex flex-wrap gap-2">
                          {interestTags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-3 py-1 text-xs sm:text-[13px] font-medium text-accent-fg border border-accent-subtle-border hover:scale-105 transition-transform"
                            >
                              <span>✨</span>
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {languageTags.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-2">Languages Spoken</span>
                        <div className="flex flex-wrap gap-2">
                          {languageTags.map(lang => (
                            <span
                              key={lang}
                              className="rounded-lg bg-slate-100 dark:bg-[#151515] px-3 py-1 text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.06]"
                            >
                              🌐 {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Social Links & Web Presence */}
              {(profile.website || profile.github || profile.twitter || profile.linkedin || profile.instagram) && (
                <div className="ultranet-card p-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.08] pb-3">
                    <Globe size={16} className="text-accent-fg" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Web Presence & Social Links</h2>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {profile.website && (
                      <a
                        href={formatWebsiteUrl(profile.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3.5 text-slate-800 dark:text-slate-200 hover:border-accent-subtle-border hover:bg-accent-subtle transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Link2 size={18} className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 shrink-0 transition-colors" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold block truncate">Personal Website</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{formatWebsiteDisplay(profile.website)}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-fg shrink-0" />
                      </a>
                    )}

                    {profile.github && (
                      <a
                        href={formatSocialUrl('github', profile.github)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3.5 text-slate-800 dark:text-slate-200 hover:border-accent-subtle-border hover:bg-accent-subtle transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GithubIcon size={18} className="text-slate-700 dark:text-slate-300 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold block">GitHub</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{profile.github}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-fg shrink-0" />
                      </a>
                    )}

                    {profile.twitter && (
                      <a
                        href={formatSocialUrl('twitter', profile.twitter)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3.5 text-slate-800 dark:text-slate-200 hover:border-accent-subtle-border hover:bg-accent-subtle transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TwitterXIcon size={18} className="text-slate-900 dark:text-slate-100 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold block">X / Twitter</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{profile.twitter}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-fg shrink-0" />
                      </a>
                    )}

                    {profile.linkedin && (
                      <a
                        href={formatSocialUrl('linkedin', profile.linkedin)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3.5 text-slate-800 dark:text-slate-200 hover:border-accent-subtle-border hover:bg-accent-subtle transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <LinkedinIcon size={18} className="text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold block">LinkedIn</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{profile.linkedin}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-fg shrink-0" />
                      </a>
                    )}

                    {profile.instagram && (
                      <a
                        href={formatSocialUrl('instagram', profile.instagram)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#151515]/60 p-3.5 text-slate-800 dark:text-slate-200 hover:border-accent-subtle-border hover:bg-accent-subtle transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <InstagramIcon size={18} className="text-pink-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold block">Instagram</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">{profile.instagram}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-accent-fg shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}


          {activeTab === 'friends' && (
            <UserGridList
              title="Friends"
              description={`People who follow ${profile.fullName || profile.username} and are followed back.`}
              emptyTitle="No friends yet"
              emptyDescription="When two people follow each other, they automatically become friends on Common Ground."
              users={profile.friendsList || profile.friends}
              badgeText="Mutual"
            />
          )}
        </div>

        {/* Right Column Widgets */}
        {(allMediaPhotos.length > 0 || whoToFollow.length > 0) && (
          <div className={`space-y-4 order-2 lg:order-3 xl:order-3 ${activeTab === 'timeline' ? 'block' : 'hidden lg:block'}`}>
            {/* Recent Media Widget */}
            {allMediaPhotos.length > 0 && (
              <div className="ultranet-card p-4">
                <div className="flex items-center justify-between pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Recent Media</h2>
                  <button type="button" onClick={() => setActiveTab('photos')} className="text-xs font-medium text-accent-fg hover:underline cursor-pointer">View all</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-1.5">
                  {allMediaPhotos.slice(0, 6).map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.post.id}-${idx}`}
                      onClick={() => setActivePhotoModalPost(item.post)}
                      className="relative aspect-square overflow-hidden rounded bg-slate-100 dark:bg-[#151515] border dark:border-white/[0.08] cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view full post"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(item.url)!}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Who to Follow Widget */}
            {whoToFollow.length > 0 && (
              <div className="ultranet-card p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-accent-subtle text-accent-fg border border-accent-subtle-border">
                      <UserPlus size={13} strokeWidth={2} />
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Who to follow
                    </h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {whoToFollow.map((suggested) => {
                    const isFollowing = Boolean(followingMap[suggested.id]);
                    return (
                      <div
                        key={suggested.id}
                        className="flex items-center justify-between gap-2.5 group"
                      >
                        <Link
                          href={`/profile/${encodeURIComponent(suggested.username)}`}
                          className="flex items-center gap-2.5 min-w-0 flex-1"
                        >
                          <UserAvatar
                            src={mediaUrl(suggested.avatarUrl)}
                            name={suggested.fullName || suggested.username}
                            className="size-9 rounded-full shrink-0 border border-slate-200/80 dark:border-white/10 group-hover:ring-2 ring-accent/30 transition-all"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-accent-fg transition-colors">
                                {suggested.fullName || suggested.username}
                              </span>
                              {suggested.isVerified && <VerifiedBadge size={13} />}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              @{suggested.username}
                            </span>
                          </div>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleToggleFollowSuggested(suggested)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                            isFollowing
                              ? 'border border-slate-300 dark:border-white/10 bg-white dark:bg-[#151515] text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600'
                              : 'bg-accent text-accent-text hover:bg-accent-hover'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                  <Link
                    href="/friends?tab=suggestions"
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 text-center text-xs font-semibold text-accent-fg hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer"
                  >
                    <span>See all suggestions</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Fullscreen Media Modal for Profile Picture & Cover Photo */}
      {viewingMediaModal && (
        <FullscreenMediaModal
          src={viewingMediaModal.src}
          title={viewingMediaModal.title}
          author={{
            username: profile.username,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
            isVerified: profile.isVerified,
          }}
          onClose={() => setViewingMediaModal(null)}
          onRemove={isSelf ? () => void handleRemoveMedia(viewingMediaModal.type) : undefined}
          isRemoving={isRemovingMedia}
          onChangePhoto={isSelf ? (file) => void handleUploadDirect(viewingMediaModal.type, file) : undefined}
          isUploading={viewingMediaModal.type === 'avatar' ? isUploadingAvatar : isUploadingCover}
        />
      )}

      {/* Fullscreen Post Modal (Except Top Bar with Cross Button) for Photos Tab */}
      {activePhotoModalPost && (
        <FullscreenPostModal
          post={activePhotoModalPost}
          onClose={() => setActivePhotoModalPost(null)}
          isSaved={savedPostIds.includes(activePhotoModalPost.id)}
          onToggleSave={handleToggleSave}
          onDeleted={(deletedId) => {
            setActivePhotoModalPost(null);
            setProfile(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                posts: prev.posts.filter(p => p.id !== deletedId),
                _count: {
                  ...prev._count,
                  posts: Math.max(0, prev._count.posts - 1),
                },
              };
            });
          }}
        />
      )}

      {/* Followers & Following Modal */}
      {profile && (
        <FollowersModal
          isOpen={connectionsModal.isOpen}
          onClose={handleCloseConnectionsModal}
          initialTab={connectionsModal.tab}
          profileUsername={profile.username}
          profileFullName={profile.fullName}
          followers={profile.followersList}
          following={profile.followingList}
          followersCount={profile._count?.followers}
          followingCount={profile._count?.following}
        />
      )}
    </div>
  );
}
