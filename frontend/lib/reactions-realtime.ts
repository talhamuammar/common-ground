'use client';

import { useEffect } from 'react';
import { API_URL } from './api';

export type ReactionSyncEvent = {
  postId: number;
  userId: number;
  type: string | null;
  liked: boolean;
  totalLikes: number;
  likes?: { userId: number; type?: string }[];
};

const SYNC_EVENT_NAME = 'cg:reaction-sync';
const CHANNEL_NAME = 'cg-reactions-channel';

/**
 * Broadcasts a reaction event across all components in the current window
 * and across all open browser tabs via BroadcastChannel.
 */
export function broadcastReaction(event: ReactionSyncEvent) {
  if (typeof window === 'undefined') return;

  // 1. Dispatch in current window
  window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: event }));

  // 2. Broadcast across tabs
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch {}
}

/**
 * Global SSE stream listener singleton:
 * Connects to NestJS SSE stream at /posts/stream/reactions and relays events.
 */
let sseInitialized = false;

export function initGlobalReactionsStream() {
  if (typeof window === 'undefined' || sseInitialized) return;
  sseInitialized = true;

  // Cross-tab broadcast listener
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (e: MessageEvent<ReactionSyncEvent>) => {
        if (e.data && e.data.postId) {
          window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: e.data }));
        }
      };
    }
  } catch {}

  // Server-Sent Events listener for cross-user real-time updates
  let eventSource: EventSource | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;

  function connect() {
    try {
      eventSource = new EventSource(`${API_URL}/posts/stream/reactions`);

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as ReactionSyncEvent;
          if (data && data.postId) {
            window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: data }));
          }
        } catch {}
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };
    } catch {}
  }

  connect();
}

/**
 * React hook to subscribe a component or page to live real-time reaction events.
 */
export function useReactionsSync(callback: (event: ReactionSyncEvent) => void) {
  useEffect(() => {
    initGlobalReactionsStream();

    function handleEvent(e: Event) {
      const customEvent = e as CustomEvent<ReactionSyncEvent>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    }

    window.addEventListener(SYNC_EVENT_NAME, handleEvent);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleEvent);
    };
  }, [callback]);
}
