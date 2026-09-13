'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { API_URL, getErrorMessage, mediaUrl } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { VerifiedBadge } from './verified-badge';
import { X, Plus } from 'lucide-react';
import { useMentionAutocomplete, MentionSuggestions, MentionUser } from './mention-autocomplete';

const MAX_PHOTOS = 8;

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

export function CreatePostForm({ initialContent = '' }: { initialContent?: string }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const { user, token, ready, logout, refresh } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

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
  } = useMentionAutocomplete({
    content,
    setContent,
    textareaRef,
  });

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

  function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPEG, PNG, WebP, GIF) are supported.');
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('Each image must be 8 MB or smaller.');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setImages((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_PHOTOS) {
        setError(`You can upload up to ${MAX_PHOTOS} photos.`);
        return combined.slice(0, MAX_PHOTOS);
      }
      setError('');
      return combined;
    });
    event.target.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

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
    setContent((prev) => prev.replace(regex, ''));
    setMentionedUsers((prev) => prev.filter((u) => u.id !== userToRemove.id));
  }, [setMentionedUsers]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('content', content);

      const activeUsernames = Array.from(new Set(activeMentions.map((u) => u.username)));
      if (activeUsernames.length > 0) {
        formData.append('mentionedUsernames', JSON.stringify(activeUsernames));
      }

      images.forEach((img) => {
        formData.append('images', img);
      });

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload: unknown = await response.json();
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not publish your post'));
      setContent('');
      setImages([]);
      setMentionedUsers([]);
      void refresh();
      router.push('/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="animate-pulse rounded-lg bg-white dark:bg-[#0d0d0d] p-8 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] px-5 py-12 text-center text-slate-900 dark:text-slate-100">
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">You need to log in before you can share a post.</p>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-text hover:bg-accent-hover transition-colors" href="/login">Log in</Link>
      </div>
    );
  }

  return (
    <form className="flex min-h-0 flex-col rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-5 sm:p-7 text-slate-900 dark:text-slate-100" onSubmit={submit}>
      <div className="mb-5 flex items-center gap-3">
        <UserAvatar src={user?.avatarUrl} name={user?.fullName || user?.username || 'U'} className="size-10 shrink-0 rounded-full border-[3px] border-white dark:border-[#0d0d0d] bg-slate-100 dark:bg-[#151515] text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-white/10"/>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.fullName || user?.username || 'Your account'}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Public post</p>
        </div>
      </div>
      <label className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100" htmlFor="content">Share a thought, perspective, or story</label>
      <div className="relative min-h-24">
        {/* Highlight Backdrop: renders mentioned names in bold text */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full overflow-hidden whitespace-pre-wrap break-words font-sans text-base leading-7 text-slate-900 dark:text-slate-100 select-none p-0 m-0 border-0"
        >
          {renderEditorBackdrop(content, activeMentions)}
        </div>

        <textarea
          id="content"
          ref={textareaRef}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            checkMentionTrigger(event.target.selectionStart);
          }}
          onSelect={(event) => {
            checkMentionTrigger((event.target as HTMLTextAreaElement).selectionStart);
          }}
          onScroll={(event) => {
            if (backdropRef.current) {
              backdropRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
          onKeyDown={(event) => {
            const handled = handleMentionKeyDown(event);
            if (handled) return;
          }}
          maxLength={500}
          placeholder="What insight, story, or reflection would you like to share today?"
          className="relative min-h-24 w-full flex-1 resize-none border-0 bg-transparent p-0 font-sans text-base leading-7 text-transparent caret-slate-900 dark:caret-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none selection:bg-accent/30"
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
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap pt-2 pb-1 border-t border-zinc-100 dark:border-white/[0.06] animate-in fade-in duration-150">
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

      {/* Multiple Photos Preview */}
      {previews.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Attached photos ({previews.length}/{MAX_PHOTOS})</span>
            {images.length < MAX_PHOTOS && (
              <label
                htmlFor="post-images"
                className="inline-flex items-center gap-1 font-semibold text-accent-fg hover:underline transition-colors cursor-pointer"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add more</span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {previews.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-black/40 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white pointer-events-none">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                  title={`Remove photo ${idx + 1}`}
                  aria-label={`Remove photo ${idx + 1}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {images.length < MAX_PHOTOS && (
              <label
                htmlFor="post-images"
                className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 text-slate-500 hover:text-accent-fg hover:border-accent dark:text-slate-400 dark:hover:text-accent-fg dark:hover:border-accent transition-all cursor-pointer gap-1.5 bg-slate-50/50 dark:bg-white/[0.02]"
                title="Add another photo"
              >
                <div className="grid size-8 place-items-center rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-semibold">Add photo</span>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-zinc-100 dark:border-white/[0.08] pt-4">
        <div className="flex items-center gap-3">
          <label htmlFor="post-images" className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-zinc-200 dark:border-white/10 px-4 text-xs font-semibold text-accent-fg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
            {images.length > 0 ? `Add more photos (${images.length}/${MAX_PHOTOS})` : 'Add photos'}
          </label>
          <input id="post-images" className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImages}/>

          {images.length > 0 && <button type="button" onClick={() => setImages([])} className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600">Remove all</button>}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-slate-400 dark:text-slate-500" aria-live="polite">{content.length} / 500</span>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-text hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors shrink-0 whitespace-nowrap shadow-xs"
            disabled={loading || (!content.trim() && images.length === 0)}
          >
            {loading ? 'Publishing…' : 'Publish post'}
          </button>
        </div>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 dark:bg-rose-950/40 px-4 py-3 text-sm leading-6 text-red-700 dark:text-rose-300 border border-red-200 dark:border-rose-900/50" role="alert">{error}</p>}
    </form>
  );
}
