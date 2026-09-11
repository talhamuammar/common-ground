import Link from 'next/link';
import { CreatePostForm } from '../../components/create-post-form';

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  return (
    <div className="min-h-[calc(100dvh-144px)] min-h-[420px] p-4 sm:p-6 md:min-h-[calc(100dvh-64px)] flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create a post</h1>
          <p className="mt-1 text-xs text-muted dark:text-slate-400">Share an update with the community.</p>
        </div>
        <Link href="/" className="text-xs font-medium text-muted hover:text-accent-fg transition-colors">Cancel</Link>
      </header>
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <CreatePostForm initialContent={typeof prompt === 'string' ? prompt.slice(0, 500) : ''} />
        <aside className="hidden self-start rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] p-6 xl:block shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Post details</h2>
          <dl className="mt-5 space-y-5 text-xs">
            <div><dt className="text-muted dark:text-slate-400">Audience</dt><dd className="mt-1.5 font-medium text-slate-800 dark:text-slate-200">Everyone</dd></div>
            <div><dt className="text-muted dark:text-slate-400">Format</dt><dd className="mt-1.5 font-medium text-slate-800 dark:text-slate-200">Text with optional image</dd></div>
            <div><dt className="text-muted dark:text-slate-400">Character limit</dt><dd className="mt-1.5 font-medium text-slate-800 dark:text-slate-200">500 characters</dd></div>
          </dl>
          <p className="mt-6 border-t border-zinc-100 dark:border-white/[0.08] pt-5 text-xs leading-6 text-muted dark:text-slate-400">Your post will appear in the community feed and on your profile. Images can be up to 5 MB.</p>
        </aside>
      </div>
    </div>
  );
}
