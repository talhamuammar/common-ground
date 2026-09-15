'use client';

import React, { useState, useRef, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import {
  X,
  Image as ImageIcon,
  SquarePen,
  Hash,
  Plus,
  Loader2,
} from 'lucide-react';
import { API_URL, getErrorMessage, mediaUrl, Post } from '../lib/api';
import { useAuth } from './auth-provider';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { useMentionAutocomplete, MentionSuggestions } from './mention-autocomplete';

const MAX_PHOTOS = 8;

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: (post: Post) => void;
}

export function EditPostModal({
  post,
  isOpen,
  onClose,
  onPostUpdated,
}: EditPostModalProps) {
  const { user, token } = useAuth();

  // Pre-fill existing content and images
  const [content, setContent] = useState(post.content || '');
  const [retainedImages, setRetainedImages] = useState<string[]>(() => {
    if (post.imageUrls && post.imageUrls.length > 0) return [...post.imageUrls];
    if (post.imageUrl) return [post.imageUrl];
    return [];
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever modal opens or post changes
  useEffect(() => {
    if (isOpen) {
      setContent(post.content || '');
      let imgs: string[] = [];
      if (post.imageUrls && post.imageUrls.length > 0) imgs = [...post.imageUrls];
      else if (post.imageUrl) imgs = [post.imageUrl];
      setRetainedImages(imgs);
      setNewImages([]);
      setNewPreviews([]);
      setError('');
    }
  }, [isOpen, post]);

  // Sync new previews whenever newImages change
  useEffect(() => {
    if (newImages.length === 0) {
      setNewPreviews([]);
      return;
    }
    const urls = newImages.map((img) => URL.createObjectURL(img));
    setNewPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  // Fetch suggested topic tags dynamically
  useEffect(() => {
    if (!isOpen || !showTags || popularTags.length > 0) return;
    let active = true;
    setLoadingTags(true);
    fetch(`${API_URL}/posts/suggested-tags`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { label?: string; tag?: string }[]) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          setPopularTags(
            data
              .map((d) => d.tag || (d.label ? `#${d.label}` : ''))
              .filter(Boolean),
          );
        } else {
          setPopularTags(['#technology', '#design', '#photography', '#art', '#community', '#music']);
        }
      })
      .catch(() => {
        if (active) {
          setPopularTags(['#technology', '#design', '#photography', '#art', '#community', '#music']);
        }
      })
      .finally(() => {
        if (active) setLoadingTags(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, showTags, popularTags.length]);

  const handleContentChange = (val: string | ((prev: string) => string)) => {
    if (typeof val === 'function') {
      setContent((prev) => val(prev));
    } else {
      setContent(val);
    }
    if (error) setError('');
  };

  const {
    isOpen: isMentionOpen,
    users: mentionUsers,
    loading: mentionLoading,
    selectedIndex: mentionSelectedIndex,
    query: mentionQuery,
    coordinates: mentionCoordinates,
    setSelectedIndex: setMentionSelectedIndex,
    selectUser: selectMentionUser,
    handleKeyDown: handleMentionKeyDown,
    checkMentionTrigger,
    mentionedUsers,
  } = useMentionAutocomplete({
    content,
    setContent: handleContentChange,
    textareaRef,
  });

  const totalImagesCount = retainedImages.length + newImages.length;

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_PHOTOS - totalImagesCount;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed per post.`);
      return;
    }

    const validFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (validFiles.length < files.length && remainingSlots < files.length) {
      setError(`Only added ${validFiles.length} photos. Maximum is ${MAX_PHOTOS}.`);
    }

    setNewImages((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveRetainedImage = (indexToRemove: number) => {
    setRetainedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddTag = (tag: string) => {
    setContent((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${tag} `;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed} ${tag} `;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSave = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();

      const trimmed = content.trim();
      if (!trimmed && totalImagesCount === 0) {
        setError('Post must contain text or at least one photo');
        return;
      }
      if (!token) return;

      setLoading(true);
      setError('');

      try {
        const formData = new FormData();
        formData.append('content', trimmed || '');

        const activeMentions = mentionedUsers
          .filter((u) => {
            const name = u.fullName || u.username;
            return trimmed.toLowerCase().includes(name.toLowerCase());
          })
          .map((u) => u.username);

        if (activeMentions.length > 0) {
          formData.append('mentionedUsernames', JSON.stringify(activeMentions));
        }

        formData.append('existingImageUrls', JSON.stringify(retainedImages));

        newImages.forEach((img) => {
          formData.append('images', img);
        });

        const res = await fetch(`${API_URL}/posts/${post.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(getErrorMessage(data, 'Could not update post'));
        }

        onPostUpdated(data as Post);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to update post');
      } finally {
        setLoading(false);
      }
    },
    [content, totalImagesCount, token, mentionedUsers, retainedImages, newImages, post.id, onPostUpdated, onClose],
  );

  // Keyboard shortcut (Escape to close, Cmd/Ctrl + Enter to save)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit post"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c0e0c] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <SquarePen size={18} className="text-accent-fg" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Edit Post
            </h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 [scrollbar-width:thin]">
          {/* Author info */}
          <div className="flex items-center gap-3">
            <UserAvatar
              src={mediaUrl(user?.avatarUrl)}
              name={user?.fullName || user?.username || 'You'}
              className="size-10 rounded-full border border-slate-100 dark:border-white/[0.08]"
              sizes="40px"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {user?.fullName || user?.username}
                </span>
                {user?.isVerified && <VerifiedBadge size={13} />}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Editing your public post
              </span>
            </div>
          </div>

          {/* Textarea for Post Content with Mentions */}
          <div className="relative min-h-[120px] rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#141414] focus-within:border-accent-fg focus-within:ring-1 focus-within:ring-accent-fg transition-all">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                handleContentChange(e.target.value);
                checkMentionTrigger(e.target.selectionStart);
              }}
              onKeyDown={handleMentionKeyDown}
              placeholder="What would you like to update?"
              maxLength={500}
              rows={4}
              className="w-full resize-none bg-transparent p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden leading-relaxed"
            />

            {/* Mention Suggestions Popover */}
            <MentionSuggestions
              isOpen={isMentionOpen}
              users={mentionUsers}
              loading={mentionLoading}
              selectedIndex={mentionSelectedIndex}
              query={mentionQuery}
              coordinates={mentionCoordinates}
              onSelectUser={selectMentionUser}
              onHoverIndex={setMentionSelectedIndex}
            />

            {/* Character counter */}
            <div className="flex items-center justify-end px-3 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
              <span>{content.length}/500</span>
            </div>
          </div>

          {/* Photos Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <ImageIcon size={14} />
                <span>Photos ({totalImagesCount}/{MAX_PHOTOS})</span>
              </span>
              {totalImagesCount < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] text-accent-fg hover:underline cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add photos</span>
                </button>
              )}
            </div>

            {/* Image Previews Grid */}
            {totalImagesCount > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {/* Existing Retained Images */}
                {retainedImages.map((url, idx) => (
                  <div
                    key={`retained-${idx}`}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#1a1a1a]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(url) || url}
                      alt={`Photo ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRetainedImage(idx)}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Remove photo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {/* Newly Added Images */}
                {newPreviews.map((preview, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-accent/60 bg-slate-100 dark:bg-[#1a1a1a]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`New Photo ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 rounded bg-accent/90 px-1 py-0.5 text-[9px] font-bold text-accent-text">
                      New
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(idx)}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Remove photo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-4 text-center cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <ImageIcon size={20} className="text-slate-400 mb-1" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Click to add photos to your post
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Suggested Topic Tags */}
          <div>
            <button
              type="button"
              onClick={() => setShowTags((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Hash size={13} />
              <span>{showTags ? 'Hide topic tags' : 'Suggest topic tags'}</span>
            </button>

            {showTags && (
              <div className="mt-2 flex flex-wrap gap-1.5 pt-1 animate-in fade-in duration-150">
                {loadingTags && (
                  <span className="text-xs text-slate-400">Loading topics…</span>
                )}
                {!loadingTags &&
                  popularTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="rounded-lg bg-slate-100 dark:bg-[#181818] px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-accent-subtle hover:text-accent-fg transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06] px-4 py-3 sm:px-5 bg-slate-50/50 dark:bg-[#0f110f]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || (!content.trim() && totalImagesCount === 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-accent-text hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>{loading ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
