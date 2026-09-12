'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, Post } from '../lib/api';
import { initCrossTabSync, SYNC_FOLLOW_EVENT, FollowChangeEvent } from '../lib/realtime';

type Profile = {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  birthDate: string | null;
  bio: string | null;
  location: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  hometown?: string | null;
  hometownLat?: number | null;
  hometownLng?: number | null;
  work?: string | null;
  education?: string | null;
  pronouns?: string | null;
  relationship?: string | null;
  languages?: string | null;
  interests?: string | null;
  website: string | null;
  github?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified?: boolean;
  theme?: string | null;
  createdAt: string;
  _count: { posts: number; followers?: number; following?: number };
  posts: Post[];
};
type Session = {
  user: Profile | null; token: string | null; ready: boolean; error: string;
  login: (token: string) => Promise<void>; logout: () => void; refresh: () => Promise<void>;
};
const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async (accessToken: string | null) => {
    const request = ++generation.current;
    setToken(accessToken);
    setError('');
    if (!accessToken) { setUser(null); setReady(true); return; }
    try {
      const response = await fetch(API_URL + '/auth/me', {
        headers: { Authorization: 'Bearer ' + accessToken }, cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (request !== generation.current) return;
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        setToken(null); setUser(null);
        return;
      }
      if (!response.ok) throw new Error('Unable to load your account. Please try again.');
      const profile: Profile = await response.json();
      if (request === generation.current) {
        setUser(profile);
        if (profile.theme === 'light' || profile.theme === 'dark') {
          const root = document.documentElement;
          if (profile.theme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
            root.style.colorScheme = 'dark';
          } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
            root.style.colorScheme = 'light';
          }
          try {
            localStorage.setItem('theme', profile.theme);
          } catch {}
        }
      }
    } catch {
      if (request === generation.current) setError('Unable to load your account. Please try again.');
    } finally {
      if (request === generation.current) setReady(true);
    }
  }, []);
  const refresh = useCallback(() => load(localStorage.getItem('accessToken')), [load]);
  useEffect(() => {
    const requests = generation;
    void refresh();
    const sync = () => { void refresh(); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'accessToken' || event.key === null) { setUser(null); sync(); }
    };
    initCrossTabSync();

    const handleFollowChange = (event: Event) => {
      const customEvent = event as CustomEvent<FollowChangeEvent>;
      if (customEvent.detail && typeof customEvent.detail.delta === 'number') {
        setUser((prev) => {
          if (!prev) return prev;
          const currentFollowing = prev._count?.following ?? 0;
          const nextFollowing = Math.max(0, currentFollowing + customEvent.detail.delta);
          return {
            ...prev,
            _count: {
              ...prev._count,
              following: nextFollowing,
            },
          };
        });
      }
    };

    window.addEventListener('storage', storage);
    window.addEventListener('focus', sync);
    window.addEventListener(SYNC_FOLLOW_EVENT, handleFollowChange);
    const interval = window.setInterval(sync, 60000);
    return () => {
      requests.current++;
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', sync);
      window.removeEventListener(SYNC_FOLLOW_EVENT, handleFollowChange);
      window.clearInterval(interval);
    };
  }, [refresh]);
  async function login(accessToken: string) {
    localStorage.setItem('accessToken', accessToken);
    setUser(null);
    await load(accessToken);
  }
  function logout() {
    generation.current++;
    localStorage.removeItem('accessToken');
    setUser(null); setToken(null); setError(''); setReady(true);
    router.push('/'); router.refresh();
  }
  return <AuthContext.Provider value={{ user, token, ready, error, login, logout, refresh }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw new Error('useAuth requires AuthProvider');
  return session;
}
