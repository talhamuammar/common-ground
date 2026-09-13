'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';
import {
  X,
  Image as ImageIcon,
  SquarePen,
  Hash,
  Plus,
} from 'lucide-react';
import { API_URL, getErrorMessage, mediaUrl, Post } from '../lib/api';
import { useAuth } from './auth-provider';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { useMentionAutocomplete, MentionSuggestions, MentionUser } from './mention-autocomplete';

const MAX_PHOTOS = 8;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  initialImage?: File | null;
  initialImages?: File[];
}

// Persist post draft in module state across modal open/close and unmount
let moduleDraftContent = '';
let moduleDraftImages: File[] = [];

function renderEditorBackdrop(content: string, mentions: MentionUser[]) {
  if (!content) return null;

  const validNames = mentions
    .map((m) => m.fullName || m.username)
    .filter((n): n is string => Boolean(n && n.trim().length > 0))
    .sort((a, b) => b.length - a.length);

  if (validNames.length === 0) {
    return <span>{content}</span>;
  }

  const escaped = validNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'g');
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMention = validNames.some((n) => n.toLowerCase() === part.toLowerCase());
        if (isMention) {
          return (
            <strong
              key={i}
              className="font-bold text-slate-900 dark:text-white underline decoration-accent decoration-2 underline-offset-2"
            >
              {part}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
  initialImage = null,
  initialImages = [],
}: CreatePostModalProps) {
  const { user, token } = useAuth();
  const [content, setContent] = useState(() => moduleDraftContent);
  const [images, setImages] = useState<File[]>(() => {
    if (initialImages && initialImages.length > 0) return initialImages.slice(0, MAX_PHOTOS);
    if (initialImage) return [initialImage];
    if (moduleDraftImages.length > 0) return moduleDraftImages;
    return [];
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

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
              .map((item) => (item.label || item.tag?.replace(/^#/, '') || '').trim())
              .filter(Boolean)
              .slice(0, 10)
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingTags(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, showTags, popularTags.length]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const handleContentChange = (val: string | ((prev: string) => string)) => {
    if (typeof val === 'function') {
      setContent((prev) => {
        const next = val(prev);
        moduleDraftContent = next;
        return next;
      });
    } else {
      setContent(val);
      moduleDraftContent = val;
    }
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
    setMentionedUsers,
    close: closeMention,
  } = useMentionAutocomplete({
    content,
    setContent: handleContentChange,
    textareaRef,
  });

  // Sync previews whenever images change
  useEffect(() => {
    if (images.length === 0) {
      setPreviews([]);
      return;
    }
    const urls = images.map((img) => URL.createObjectURL(img));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Handle initial images if passed from parent
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      const clamped = initialImages.slice(0, MAX_PHOTOS);
      setImages(clamped);
      moduleDraftImages = clamped;
    } else if (initialImage) {
      setImages([initialImage]);
      moduleDraftImages = [initialImage];
    }
  }, [initialImage, initialImages]);

  const handleDiscardDraft = () => {
    moduleDraftContent = '';
    moduleDraftImages = [];
    setContent('');
    setImages([]);
    setError('');
    setShowTags(false);
    setMentionedUsers([]);
    closeMention();
  };

  const activeMentions = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return [];
    return mentionedUsers.filter((u) => {
      const name = u.fullName || u.username;
      return trimmed.toLowerCase().includes(name.toLowerCase());
    });
  }, [mentionedUsers, content]);

  const handleRemoveMention = useCallback((userToRemove: MentionUser) => {
    const name = userToRemove.fullName || userToRemove.username;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b\\s*`, 'i');
    setContent((prev) => {
      const next = prev.replace(regex, '');
      moduleDraftContent = next;
      return next;
    });
    setMentionedUsers((prev) => prev.filter((u) => u.id !== userToRemove.id));
  }, [setMentionedUsers]);

  const handlePublish = useCallback(async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed && images.length === 0) {
      setError('Please write something or attach at least one photo');
      return;
    }
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', trimmed || '');

      const activeUsernames = Array.from(new Set(activeMentions.map((u) => u.username)));
      if (activeUsernames.length > 0) {
        formData.append('mentionedUsernames', JSON.stringify(activeUsernames));
      }

      images.forEach((img) => {
        formData.append('images', img);
      });

      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Could not create post'));
      }

      // Clear draft on successful publish
      moduleDraftContent = '';
      moduleDraftImages = [];
      setContent('');
      setImages([]);
      setError('');
      setShowTags(false);
      setMentionedUsers([]);

      onPostCreated(data as Post);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }, [content, images, token, onPostCreated, onClose, mentionedUsers, setMentionedUsers]);

  // Keyboard shortcut (Escape to close, Cmd/Ctrl + Enter to publish)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isMentionOpen) {
          closeMention();
          return;
        }
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const canSubmit = Boolean(content.trim() || images.length > 0);
        if (canSubmit && !loading) {
          handlePublish();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, content, images, loading, onClose, handlePublish, isMentionOpen, closeMention]);

  // Focus textarea when modal opens without resetting draft content
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  function handleFilesSelect(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPEG, PNG, WebP, GIF) are supported');
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('Each image must be under 8 MB');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setImages((prev) => {
      const combined = [...prev, ...validFiles];
      const clamped = combined.length > MAX_PHOTOS ? combined.slice(0, MAX_PHOTOS) : combined;
      if (combined.length > MAX_PHOTOS) {
        setError(`You can attach up to ${MAX_PHOTOS} photos per post`);
      } else {
        setError('');
      }
      moduleDraftImages = clamped;
      return clamped;
    });
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
      e.target.value = '';
    }
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      moduleDraftImages = updated;
      return updated;
    });
  }

  function handleAddTag(tag: string) {
    setContent((prev) => {
      const trimmed = prev.trim();
      let next = '';
      if (!trimmed) next = `#${tag} `;
      else if (trimmed.includes(`#${tag}`)) next = prev;
      else next = `${trimmed} #${tag} `;
      moduleDraftContent = next;
      return next;
    });
    textareaRef.current?.focus();
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    onClose();
  };

  if (!isOpen) return null;

  const canPublish = Boolean(content.trim() || images.length > 0);
  const charLimit = 500;
  const charsLeft = charLimit - content.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111312] shadow-2xl overflow-hidden"
      >
        {/* Simple Clean Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <SquarePen size={17} className="text-slate-500 dark:text-slate-400" />
            <h2 id="create-post-modal-title" className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              New Post
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {canPublish && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Discard draft and reset"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 [scrollbar-width:thin]">
          {/* Author Info */}
          <div className="flex items-center gap-3">
            <UserAvatar
              src={mediaUrl(user?.avatarUrl)}
              name={user?.fullName || user?.username || 'You'}
              className="size-10 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold shrink-0"
              sizes="40px"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user?.fullName || user?.username}
                </span>
                {user?.isVerified && <VerifiedBadge size={14} />}
              </div>
            </div>
          </div>

          {/* Text Area with Mention Highlight Backdrop */}
          <div className="relative min-h-[120px]">
            {/* Highlight Backdrop: renders mentioned names in bold text */}
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full overflow-hidden whitespace-pre-wrap break-words font-sans text-[15px] sm:text-base leading-relaxed text-slate-900 dark:text-slate-100 select-none p-0 m-0 border-0"
            >
              {renderEditorBackdrop(content, activeMentions)}
            </div>

            <textarea
              ref={textareaRef}
              rows={previews.length > 0 ? 3 : 5}
              value={content}
              onChange={(e) => {
                handleContentChange(e.target.value);
                checkMentionTrigger(e.target.selectionStart);
              }}
              onSelect={(e) => {
                checkMentionTrigger((e.target as HTMLTextAreaElement).selectionStart);
              }}
              onScroll={(e) => {
                if (backdropRef.current) {
                  backdropRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              onKeyDown={(e) => {
                const handled = handleMentionKeyDown(e);
                if (handled) return;
              }}
              placeholder="Write a thought, story, or update..."
              className="relative w-full resize-none bg-transparent font-sans text-[15px] sm:text-base leading-relaxed text-transparent caret-slate-900 dark:caret-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none selection:bg-accent/30 p-0 m-0 border-0"
              maxLength={charLimit}
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
          </div>

          {/* Mentioned Users Chips Bar (Visible during post creation) */}
          {activeMentions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 pb-1 border-t border-slate-100 dark:border-white/[0.06] animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Mentioned:
              </span>
              {activeMentions.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-accent/10 dark:bg-accent/20 border border-accent/25 text-accent-fg text-xs font-bold shadow-xs"
                >
                  <UserAvatar
                    src={mediaUrl(u.avatarUrl)}
                    name={u.fullName || u.username}
                    className="size-4 rounded-full text-[9px]"
                    sizes="16px"
                  />
                  <span>{u.fullName || u.username}</span>
                  {u.isVerified && <VerifiedBadge size={12} />}
                  <button
                    type="button"
                    onClick={() => handleRemoveMention(u)}
                    className="ml-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove mention"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Attached Images Preview Grid (Shows for 1 or more photos) */}
          {previews.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Attached Photos ({previews.length}/{MAX_PHOTOS})</span>
                {images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 font-semibold text-accent-fg hover:underline transition-colors cursor-pointer"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Add more</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {previews.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-black/40 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white pointer-events-none">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title={`Remove photo ${idx + 1}`}
                      aria-label={`Remove photo ${idx + 1}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add Photo tile - always visible when under MAX_PHOTOS */}
                {images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 text-slate-500 hover:text-accent-fg hover:border-accent dark:text-slate-400 dark:hover:text-accent-fg dark:hover:border-accent transition-all cursor-pointer gap-1.5 bg-slate-50/50 dark:bg-white/[0.02]"
                    title="Add another photo"
                  >
                    <div className="grid size-8 place-items-center rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      <Plus size={16} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-semibold">Add photo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Topic Tags Bar (if toggled) */}
          {showTags && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Suggested tags
                </p>
                {loadingTags && (
                  <span className="text-[10px] text-slate-400 animate-pulse">Loading…</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map((tag) => {
                  const isAdded = content.includes(`#${tag}`);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                        isAdded
                          ? 'bg-accent text-accent-text border-accent'
                          : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
              {error}
            </div>
          )}
        </div>

        {/* Hidden Multi-File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileInputChange}
        />

        {/* Responsive Footer */}
        <footer className="border-t border-slate-100 dark:border-white/[0.08] px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50/50 dark:bg-[#0c0d0c] shrink-0 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                images.length > 0
                  ? 'bg-slate-200 text-slate-900 dark:bg-white/15 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
              title="Add photos (up to 8)"
            >
              <ImageIcon size={16} className="shrink-0" />
              <span className="hidden min-[400px]:inline">{images.length > 0 ? `Photos (${images.length})` : 'Photos'}</span>
              <span className="min-[400px]:hidden">{images.length > 0 ? `(${images.length})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTags((prev) => !prev)}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                showTags
                  ? 'bg-slate-200 text-slate-900 dark:bg-white/15 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
              title="Toggle topic tags"
            >
              <Hash size={15} className="shrink-0" />
              <span className="hidden min-[400px]:inline">Tags</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            <span
              className={`text-xs tabular-nums ${
                charsLeft <= 50 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {charsLeft}
            </span>

            <button
              type="button"
              onClick={() => handlePublish()}
              disabled={loading || !canPublish}
              className="inline-flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-accent-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            >
              {loading ? 'Posting…' : 'Publish'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
