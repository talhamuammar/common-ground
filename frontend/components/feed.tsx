import { FeedRetry } from './feed-retry';
import { API_URL, Post } from '../lib/api';
import { FeedList } from './feed-list';
import { Icon } from './icons';

async function getPosts(): Promise<Post[] | null> {
  try {
    const response = await fetch(`${API_URL}/posts`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return response.json();
  } catch { return null; }
}
export async function Feed() {
  const posts = await getPosts();
  if (posts === null) return (
    <section className="px-6 py-20 text-center">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-500"><Icon name="home" size={25}/></span>
      <h2 className="text-base font-semibold">Unable to load posts</h2>
      <p className="mx-auto mb-6 mt-2 max-w-xs text-sm leading-6 text-muted">Check your connection and try again.</p>
      <FeedRetry />
    </section>
  );
  return <FeedList posts={posts}/>;
}

