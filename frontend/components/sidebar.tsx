'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Bookmark,
  Heart,
  User,
  Settings,
  LogIn,
  UserPlus,
  Search,
  X,
  Bell,
  SquarePen,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useAuthModal } from './auth-modal';
import { UserAvatar } from './user-avatar';
import { API_URL, mediaUrl, Post, SearchUserResult } from '../lib/api';
import { VerifiedBadge } from './verified-badge';
import { ThemeToggle } from './theme-toggle';
import { CreatePostModal } from './create-post-modal';
import { BrandLogo } from './brand-logo';

function formatStatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token } = useAuth();
  const { openAuthModal } = useAuthModal();
  const profileHref = user ? `/profile/${encodeURIComponent(user.username)}` : '/profile';

  // Create post modal state
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  function handlePostCreated(newPost: Post) {
    setIsCreatePostModalOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('post-created', { detail: newPost }));
    }
    router.refresh();
  }

  // Debounced search querying GET /users/search?q=... (matching username or fullName)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to search profiles:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-focus input when modal opens and register keyboard shortcuts (Esc, Ctrl+K/Cmd+K)
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  const [sidebarUnreadCount, setSidebarUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setSidebarUnreadCount(0);
      return;
    }
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setSidebarUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const navItems = user || token
    ? [
        { href: '/', name: 'Feed', icon: Home },
        { href: '/friends', name: 'Friends', icon: Users },
        { href: '/saved', name: 'Saved', icon: Bookmark },
        { href: '/likes', name: 'Likes', icon: Heart },
        { href: '/notifications', name: 'Notifications', icon: Bell, badge: sidebarUnreadCount },
        { href: '#search', name: 'Search', icon: Search, isSearchTrigger: true },
        { href: profileHref, name: 'Profile', icon: User },
        { href: '/settings', name: 'Settings', icon: Settings },
      ]
    : [
        { href: '/', name: 'Feed', icon: Home },
        { href: '#search', name: 'Search', icon: Search, isSearchTrigger: true },
        { href: '/login', name: 'Log in', icon: LogIn },
        { href: '/register', name: 'Sign up', icon: UserPlus },
      ];

  // Core items specifically tailored for mobile bottom navigation
  const mobileNavItems = user || token
    ? [
        { href: '/', name: 'Feed', icon: Home },
        { href: '#search', name: 'Search', icon: Search, isSearchTrigger: true },
        { href: '/notifications', name: 'Alerts', icon: Bell, badge: sidebarUnreadCount },
        { href: '/friends', name: 'Friends', icon: Users },
        { href: profileHref, name: 'Profile', icon: User },
      ]
    : [
        { href: '/', name: 'Feed', icon: Home },
        { href: '#search', name: 'Search', icon: Search, isSearchTrigger: true },
        { href: '/login', name: 'Log in', icon: LogIn },
        { href: '/register', name: 'Sign up', icon: UserPlus },
      ];

  const postsCount = user?._count?.posts ?? (user?.posts?.length ?? 0);
  const followersCount = user?._count?.followers ?? 0;
  const followingCount = user?._count?.following ?? 0;

  function handleSelectProfile(username: string) {
    setIsSearchModalOpen(false);
    setSearchQuery('');
    router.push(`/profile/${encodeURIComponent(username)}`);
  }

  function handleSearchPostsTag(tag: string) {
    setIsSearchModalOpen(false);
    setSearchQuery('');
    router.push(`/?tag=${encodeURIComponent(tag.replace(/^#/, ''))}`);
  }

  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white pb-[env(safe-area-inset-bottom)] dark:border-white/[0.08] dark:bg-[#080808] md:top-14 md:bottom-0 md:left-0 md:w-[200px] lg:w-[220px] md:flex md:flex-col md:border-r md:border-t-0 md:px-4 md:py-4 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Profile Overview Card (Desktop) */}
        <div className="hidden md:flex flex-col items-center text-center px-1 pt-1 pb-1">
          {user && token ? (
            <div className="flex flex-col items-center w-full">
              <Link
                href={profileHref}
                className="group flex flex-col items-center transition-transform hover:scale-[1.02] w-full"
                aria-label="View profile"
              >
                {/* Circular Avatar with verified badge */}
                <div className="relative">
                  <div className="p-0.5 rounded-full border border-slate-200 dark:border-white/[0.1] shadow-2xs transition-transform group-hover:scale-105">
                    {user.avatarUrl ? (
                      <UserAvatar
                        src={mediaUrl(user.avatarUrl)}
                        name={user.fullName || user.username}
                        className="size-16 rounded-full text-base font-semibold object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="size-16 rounded-full bg-slate-100 dark:bg-[#181818] grid place-items-center text-xl font-bold text-slate-700 dark:text-slate-200">
                        {user.fullName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  {user.isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-110">
                      <VerifiedBadge size={21} />
                    </span>
                  )}
                </div>

                {/* Full Name */}
                <h2 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-accent-fg transition-colors truncate max-w-[180px]">
                  {user.fullName || user.username}
                </h2>

                {/* Real location or handle */}
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                  {user.location ? user.location : `@${user.username}`}
                </p>
              </Link>

              {/* 3-Column Stats Row: Posts | Followers | Following */}
              <div className="mt-3.5 grid w-full grid-cols-3 divide-x divide-slate-100 dark:divide-white/[0.08] text-center">
                <Link
                  href={profileHref}
                  className="group/stat px-1 transition-opacity hover:opacity-75"
                  title="View posts"
                >
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover/stat:text-accent-fg">
                    {formatStatNumber(postsCount)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Posts</p>
                </Link>

                <Link
                  href={`${profileHref}?tab=followers`}
                  className="group/stat px-1 transition-opacity hover:opacity-75"
                  title="View followers"
                >
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover/stat:text-accent-fg">
                    {formatStatNumber(followersCount)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Followers</p>
                </Link>

                <Link
                  href={`${profileHref}?tab=following`}
                  className="group/stat px-1 transition-opacity hover:opacity-75"
                  title="View following"
                >
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover/stat:text-accent-fg">
                    {formatStatNumber(followingCount)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Following</p>
                </Link>
              </div>
            </div>
          ) : (
            /* Logged-Out Overview */
            <Link
              href="/"
              className="group flex flex-col items-center transition-transform hover:scale-[1.02] w-full py-1.5"
              aria-label="Common Ground home"
            >
              <BrandLogo size="lg" />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Good things grow on common ground.
              </p>
            </Link>
          )}

          {/* Dotted divider line */}
          <div className="mt-3.5 mb-2 w-full border-t border-dashed border-slate-200 dark:border-white/[0.08]" />
        </div>

        {/* Mobile Bottom Navigation (< md) - Clean, 5 high-touch tabs, zero clipping */}
        <nav
          className="flex md:hidden items-center justify-around px-2 py-1 gap-1"
          aria-label="Mobile navigation"
        >
          {mobileNavItems.map((item) => {
            const { href, name, icon: NavIcon } = item;
            const isSearchTrigger = 'isSearchTrigger' in item && Boolean(item.isSearchTrigger);

            const isMyProfile = user
              ? pathname.toLowerCase() === `/profile/${encodeURIComponent(user.username).toLowerCase()}` ||
                pathname.toLowerCase().startsWith(`/profile/${encodeURIComponent(user.username).toLowerCase()}/`) ||
                pathname === '/profile' ||
                pathname === '/settings/profile'
              : pathname === '/profile';

            const active =
              name === 'Feed'
                ? pathname === '/' && !pathname.includes('tag=')
                : name === 'Friends'
                ? pathname.startsWith('/friends')
                : name === 'Alerts' || name === 'Notifications'
                ? pathname.startsWith('/notifications')
                : name === 'Profile'
                ? isMyProfile
                : pathname === href;

            if (isSearchTrigger) {
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <NavIcon size={19} strokeWidth={1.8} className="text-slate-400 dark:text-slate-500" />
                  <span>{name}</span>
                </button>
              );
            }

            return (
              <Link
                key={name}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition-colors ${
                  active
                    ? 'text-accent-fg font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <NavIcon
                    size={19}
                    strokeWidth={active ? 2.3 : 1.8}
                    className={active ? 'text-accent-fg' : 'text-slate-400 dark:text-slate-500'}
                  />
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2.5 flex min-w-3.5 h-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-2xs">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Sidebar Navigation (≥ md) */}
        <nav className="hidden md:flex flex-col gap-1" aria-label="Desktop primary navigation">
          {navItems.map((item) => {
            const { href, name, icon: NavIcon } = item;
            const isSearchTrigger = 'isSearchTrigger' in item && Boolean(item.isSearchTrigger);

            const isMyProfile = user
              ? pathname.toLowerCase() === `/profile/${encodeURIComponent(user.username).toLowerCase()}` ||
                pathname.toLowerCase().startsWith(`/profile/${encodeURIComponent(user.username).toLowerCase()}/`) ||
                pathname === '/profile' ||
                pathname === '/settings/profile'
              : pathname === '/profile';

            const active =
              name === 'Feed'
                ? pathname === '/' && !pathname.includes('tag=')
                : name === 'Friends'
                ? pathname.startsWith('/friends')
                : name === 'Saved'
                ? pathname.startsWith('/saved')
                : name === 'Likes'
                ? pathname.startsWith('/likes')
                : name === 'Notifications'
                ? pathname.startsWith('/notifications')
                : name === 'Profile'
                ? isMyProfile
                : name === 'Settings'
                ? pathname === '/settings'
                : pathname === href;

            if (isSearchTrigger) {
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100 transition-colors group cursor-pointer"
                >
                  <NavIcon size={18} strokeWidth={1.8} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                  <span>{name}</span>
                </button>
              );
            }

            return (
              <Link
                key={name}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-accent-subtle text-accent-fg font-bold border border-accent-subtle-border'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="relative">
                  <NavIcon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={active ? 'text-accent-fg' : 'text-slate-400 dark:text-slate-500'}
                  />
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex min-w-3.5 h-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-2xs">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Create Post Action Button (Desktop) */}
        <div className="mt-7 hidden md:block px-1">
          <button
            type="button"
            onClick={() => {
              if (user && token) {
                setIsCreatePostModalOpen(true);
              } else {
                openAuthModal({ title: 'Join Common Ground to share stories' });
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-accent text-accent-text font-semibold text-xs shadow-xs hover:bg-accent-hover active:scale-[0.98] transition-all cursor-pointer"
          >
            <SquarePen size={15} strokeWidth={2.2} />
            <span>Create Post</span>
          </button>
        </div>

        {/* Theme Toggle (Dark / Light Mode) */}
        <div className="mt-3 hidden md:block px-1">
          <ThemeToggle className="w-full justify-center" />
        </div>
      </aside>

      {/* Universal Search Modal (Opens upon clicking Search button on Desktop or Mobile) */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-black/70 animate-in fade-in duration-150"
          onClick={() => {
            setIsSearchModalOpen(false);
            setSearchQuery('');
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search profiles"
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.08]">
              <Search className="size-4.5 text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchModalOpen(false);
                  } else if (e.key === 'Enter' && searchQuery.trim()) {
                    if (searchResults.length > 0) {
                      handleSelectProfile(searchResults[0].username);
                    } else {
                      handleSearchPostsTag(searchQuery.trim());
                    }
                  }
                }}
                placeholder="Search profiles by name or @username..."
                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchQuery('');
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Esc
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[60vh] overflow-y-auto p-2 [scrollbar-width:thin]">
              {isSearching && searchResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  Searching profiles...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Profiles ({searchResults.length})
                  </p>
                  {searchResults.map((userItem) => (
                    <button
                      key={userItem.id}
                      type="button"
                      onClick={() => handleSelectProfile(userItem.username)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors group"
                    >
                      <UserAvatar
                        src={userItem.avatarUrl ? mediaUrl(userItem.avatarUrl) : null}
                        name={userItem.fullName || userItem.username}
                        className="size-10 rounded-full ring-1 ring-slate-200 dark:ring-white/[0.1] shrink-0"
                        sizes="40px"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-accent-fg">
                            {userItem.fullName || userItem.username}
                          </span>
                          {userItem.isVerified && <VerifiedBadge size={13} />}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                          <span className="truncate">@{userItem.username}</span>
                          {userItem._count && (
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {userItem._count.followers} {userItem._count.followers === 1 ? 'follower' : 'followers'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Filter tag link */}
                  <div className="mt-1 border-t border-slate-100 dark:border-white/[0.06] pt-1">
                    <button
                      type="button"
                      onClick={() => handleSearchPostsTag(searchQuery)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="text-accent-fg font-bold">#</span>
                      <span className="truncate">Filter stories matching &ldquo;{searchQuery}&rdquo;</span>
                    </button>
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No profiles found for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSearchPostsTag(searchQuery)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
                  >
                    Search posts for #{searchQuery.replace(/^#/, '')}
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Type any name or @username to discover members...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Create Post Modal (triggered from Left Sidebar) */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </>
  );
}
