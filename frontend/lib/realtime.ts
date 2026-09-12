'use client';

// Real-time synchronization event names
export const SYNC_FOLLOW_EVENT = 'cg:follow-change';
export const SYNC_NOTIFICATION_EVENT = 'cg:notification-sync';

const CHANNELS = {
  FOLLOW: 'cg-follow-channel',
  NOTIFICATION: 'cg-notifications-channel',
};

// Unique identifier for the current window/tab instance to prevent echo looping
const CLIENT_ID = typeof window !== 'undefined'
  ? Math.random().toString(36).substring(2, 10)
  : 'server';

export interface FollowChangeEvent {
  targetUserId: number;
  following: boolean;
  delta: number; // +1 or -1
  senderId?: string;
}

export interface NotificationSyncEvent {
  unreadCount: number;
  readAll?: boolean;
  notificationId?: number;
  senderId?: string;
}

/**
 * Broadcasts follow/unfollow events across the current window components
 * and to other open tabs via BroadcastChannel.
 */
export function broadcastFollowChange(delta: number, targetUserId?: number, following?: boolean) {
  if (typeof window === 'undefined') return;

  const eventData: FollowChangeEvent = {
    targetUserId: targetUserId ?? 0,
    following: Boolean(following),
    delta,
    senderId: CLIENT_ID,
  };

  // 1. Dispatch locally in current window
  window.dispatchEvent(new CustomEvent(SYNC_FOLLOW_EVENT, { detail: eventData }));

  // 2. Broadcast across tabs (other tabs only)
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNELS.FOLLOW);
      channel.postMessage(eventData);
      channel.close();
    }
  } catch {}
}

/**
 * Broadcasts notification count / read events across current window
 * and other open tabs via BroadcastChannel.
 */
export function broadcastNotificationSync(unreadCount: number, options?: { readAll?: boolean; notificationId?: number }) {
  if (typeof window === 'undefined') return;

  const eventData: NotificationSyncEvent = {
    unreadCount: Math.max(0, unreadCount),
    readAll: options?.readAll,
    notificationId: options?.notificationId,
    senderId: CLIENT_ID,
  };

  // 1. Dispatch locally in current window
  window.dispatchEvent(new CustomEvent(SYNC_NOTIFICATION_EVENT, { detail: eventData }));

  // 2. Broadcast across tabs (other tabs only)
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNELS.NOTIFICATION);
      channel.postMessage(eventData);
      channel.close();
    }
  } catch {}
}

/**
 * Global cross-tab listener initializer: ensures events received from OTHER tabs
 * are forwarded to the local window event system, ignoring own messages.
 */
let channelsInitialized = false;

export function initCrossTabSync() {
  if (typeof window === 'undefined' || channelsInitialized) return;
  channelsInitialized = true;

  try {
    if ('BroadcastChannel' in window) {
      const followChannel = new BroadcastChannel(CHANNELS.FOLLOW);
      followChannel.onmessage = (e: MessageEvent<FollowChangeEvent>) => {
        // Only forward if the message came from another tab/window
        if (e.data && e.data.senderId !== CLIENT_ID) {
          window.dispatchEvent(new CustomEvent(SYNC_FOLLOW_EVENT, { detail: e.data }));
        }
      };

      const notificationChannel = new BroadcastChannel(CHANNELS.NOTIFICATION);
      notificationChannel.onmessage = (e: MessageEvent<NotificationSyncEvent>) => {
        // Only forward if the message came from another tab/window
        if (e.data && e.data.senderId !== CLIENT_ID) {
          window.dispatchEvent(new CustomEvent(SYNC_NOTIFICATION_EVENT, { detail: e.data }));
        }
      };
    }
  } catch {}
}
