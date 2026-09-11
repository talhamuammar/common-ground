'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Users, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

interface AuthModalOptions {
  title?: string;
  description?: string;
}

interface AuthModalContextType {
  openAuthModal: (options?: AuthModalOptions) => void;
  closeAuthModal: () => void;
  isOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<AuthModalOptions>({});
  const pathname = usePathname();

  const openAuthModal = useCallback((options?: AuthModalOptions) => {
    setModalOptions(options || {});
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close modal on escape key or when navigating away
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        closeAuthModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeAuthModal]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const title = modalOptions.title || 'Join Common Ground';
  const description =
    modalOptions.description ||
    'Sign up or log in to post updates, join discussions, and connect with the community.';

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, isOpen }}>
      {children}

      {/* Smooth Popup Auth Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-[3px] animate-in fade-in duration-200"
          onClick={closeAuthModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div
            className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl dark:border-white/[0.1] dark:bg-[#121212] animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={closeAuthModal}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-200 transition-colors"
              aria-label="Close dialog"
            >
              <X size={17} strokeWidth={2} />
            </button>

            {/* Emblem Icon */}
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent-fg border border-accent-subtle-border ring-1 ring-accent/15">
              <Users size={22} strokeWidth={2} />
            </div>

            {/* Modal Heading & Context */}
            <h2
              id="auth-modal-title"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>

            {/* Community Values Bullet List */}
            <div className="my-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-white/[0.06] dark:bg-[#181818] dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-accent-fg shrink-0" />
                <span>Share your stories, photos, and ideas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-accent-fg shrink-0" />
                <span>Join discussions and engage with the community</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-accent-fg shrink-0" />
                <span>Follow friends and creators you care about</span>
              </div>
            </div>

            {/* Main Action Buttons: Sign up & Log in */}
            <div className="space-y-2.5">
              <Link
                href="/register"
                onClick={closeAuthModal}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 px-4 text-xs sm:text-sm font-semibold text-accent-text shadow-xs hover:bg-accent-hover transition-colors"
              >
                <UserPlus size={16} strokeWidth={2} />
                <span>Create an account</span>
              </Link>

              <Link
                href="/login"
                onClick={closeAuthModal}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/[0.12] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#222222] transition-colors"
              >
                <LogIn size={16} strokeWidth={2} />
                <span>Log in to existing account</span>
              </Link>
            </div>

            {/* Subtle Community Note */}
            <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
              A community space for genuine conversations and shared stories
            </p>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
