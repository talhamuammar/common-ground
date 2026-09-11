'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, Link2, Check, AlertCircle } from 'lucide-react';
import { API_URL, getErrorMessage } from '../lib/api';

interface PostOptionsMenuProps {
  postId: number;
  authorId: number;
  currentUserId?: number;
  token: string | null;
  postUrl?: string;
  onDeleted?: (postId: number) => void;
}

export function PostOptionsMenu({
  postId,
  authorId,
  currentUserId,
  token,
  postUrl,
  onDeleted,
}: PostOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAuthor = currentUserId === authorId;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmDelete(false);
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isOpen]);

  async function handleCopyLink() {
    try {
      const url = postUrl || (typeof window !== 'undefined' ? `${window.location.origin}/post/${postId}` : '');
      if (url && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setIsOpen(false);
        }, 1200);
      }
    } catch {
      // Fallback
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(getErrorMessage(data, 'Failed to delete post'));
      }
      setIsOpen(false);
      if (onDeleted) {
        onDeleted(postId);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete');
      setDeleting(false);
    }
  }

  return (
    <div ref={menuRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setConfirmDelete(false);
        }}
        aria-label="More options"
        className="grid size-8 place-items-center rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
      >
        <MoreHorizontal size={17} strokeWidth={2} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Post options"
          className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] p-1.5 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Copy Link Option */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <Check size={14} className="text-accent-fg shrink-0" />
            ) : (
              <Link2 size={14} className="text-slate-400 shrink-0" />
            )}
            <span>{copied ? 'Link copied!' : 'Copy post link'}</span>
          </button>

          {/* Delete Option (For Author) */}
          {isAuthor && (
            <div className="border-t border-slate-100 dark:border-white/[0.08] mt-1 pt-1">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 size={14} className="shrink-0" />
                  <span>Delete post</span>
                </button>
              ) : (
                <div className="p-1 space-y-1.5">
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-1">
                    Delete this post?
                  </p>
                  {deleteError && (
                    <p className="text-[10px] text-rose-500 flex items-center gap-1">
                      <AlertCircle size={10} /> {deleteError}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="flex-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-1 transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] font-medium py-1 px-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
