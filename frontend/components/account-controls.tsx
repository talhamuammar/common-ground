'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useTheme } from './theme-provider';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { NotificationsDropdown } from './notifications-dropdown';
import { ThemeToggle } from './theme-toggle';
import {
  Mail,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Heart,
  Bookmark,
  Users,
} from 'lucide-react';

export function AccountControls() {
  const { user, token, ready, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isDark = theme === 'dark';

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!ready) {
    return <span className="h-9 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-[#151515]" aria-label="Loading account" />;
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      {token ? (
        <>
          <button
            type="button"
            className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            aria-label="Messages"
          >
            <Mail className="size-4.5" strokeWidth={1.8} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent shadow-xs" />
          </button>

          <NotificationsDropdown />

          <div className="h-4 w-px bg-slate-200 dark:bg-white/[0.1]" />

          {/* User Name + DP Trigger Button with Dropdown Menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`group flex items-center gap-2 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-semibold transition-all border ${
                isOpen
                  ? 'bg-slate-100 dark:bg-white/[0.1] text-slate-900 dark:text-white border-slate-300 dark:border-white/20'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border-transparent'
              }`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
            >
              <span className="hidden max-w-36 truncate md:block font-medium">
                {user?.fullName || user?.username || 'Profile'}
              </span>
              <UserAvatar
                src={user?.avatarUrl}
                name={user?.username || 'U'}
                className="size-7.5 rounded-full ring-1 ring-slate-200 dark:ring-white/[0.12] text-xs shrink-0"
                sizes="30px"
              />
              <ChevronDown
                size={14}
                className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : 'group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />
            </button>

            {/* Dropdown Menu (Solid opaque surface - zero glass effect) */}
            {isOpen && (
              <div
                role="menu"
                aria-label="User account options"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User Identity Header */}
                <Link
                  href={user ? `/profile/${encodeURIComponent(user.username)}` : '/profile'}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <UserAvatar
                    src={user?.avatarUrl}
                    name={user?.username || 'U'}
                    className="size-10 rounded-full ring-1 ring-slate-200 dark:ring-white/[0.1] shrink-0"
                    sizes="40px"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {user?.fullName || user?.username}
                      </span>
                      {user?.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <span className="block truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      @{user?.username}
                    </span>
                  </div>
                </Link>

                <div className="my-1 border-t border-slate-100 dark:border-white/[0.08]" />

                {/* Option: Profile */}
                <Link
                  href={user ? `/profile/${encodeURIComponent(user.username)}` : '/profile'}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <User size={15} strokeWidth={1.8} className="text-slate-400 dark:text-slate-400" />
                  <span>Profile</span>
                </Link>

                {/* Option: Friends */}
                <Link
                  href="/friends"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <Users size={15} strokeWidth={1.8} className="text-slate-400 dark:text-slate-400" />
                  <span>Friends</span>
                </Link>

                {/* Option: Saved */}
                <Link
                  href="/saved"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <Bookmark size={15} strokeWidth={1.8} className="text-slate-400 dark:text-slate-400" />
                  <span>Saved</span>
                </Link>

                {/* Option: Likes */}
                <Link
                  href="/likes"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <Heart size={15} strokeWidth={1.8} className="text-slate-400 dark:text-slate-400" />
                  <span>Likes</span>
                </Link>

                {/* Option: Settings */}
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <Settings size={15} strokeWidth={1.8} className="text-slate-400 dark:text-slate-400" />
                  <span>Settings</span>
                </Link>

                {/* Option: Mode Switch (Dark / Light) */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? (
                      <Sun size={15} strokeWidth={1.8} className="text-amber-400" />
                    ) : (
                      <Moon size={15} strokeWidth={1.8} className="text-slate-500" />
                    )}
                    <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {isDark ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-white/[0.08]" />

                {/* Option: Log out */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  role="menuitem"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          {/* Mobile only (< sm): dark/light toggle instead of Sign up button */}
          <div className="sm:hidden">
            <ThemeToggle compact />
          </div>

          {/* sm and up: Theme toggle, Log in, and Sign up button */}
          <div className="hidden sm:flex items-center gap-2">
            <ThemeToggle compact />
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-text shadow-sm hover:bg-accent-hover transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountPanel() {
  const { user, token, ready, logout } = useAuth();
  if (!ready) return <div className="h-32 animate-pulse bg-zinc-100" aria-label="Loading account" />;
  if (token) {
    return (
      <section>
        <p className="text-xs text-muted">YOUR ACCOUNT</p>
        <h2 className="mt-3 break-all text-base font-semibold">{user?.username || 'Your profile'}</h2>
        <Link
          href={user ? `/profile/${encodeURIComponent(user.username)}` : '/profile'}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
        >
          View profile
        </Link>
        <button onClick={logout} className="mt-3 min-h-10 text-sm text-muted hover:text-ink">
          Log out
        </button>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight">New to Common Ground?</h2>
      <p className="mb-5 mt-2 text-sm leading-6 text-muted">Create an account to publish posts and join the conversation.</p>
      <Link
        href="/register"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-xs font-semibold text-accent-text hover:bg-accent-hover transition-colors"
      >
        Create account
      </Link>
      <p className="mt-4 text-xs text-muted">
        Have an account? <Link href="/login" className="font-medium text-ink hover:underline">Log in</Link>
      </p>
    </section>
  );
}
