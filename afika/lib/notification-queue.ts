/**
 * Pure helpers for the Firestore push-notification queue.
 *
 * The app only *enqueues* `pending` documents in the top-level `pushNotifications`
 * collection; the backend `notifications` worker owns delivery status. Kept
 * dependency-free so it can run in the node test runner.
 */

/** Top-level Firestore collection the notifications worker drains. */
export const NOTIFICATION_QUEUE_COLLECTION = "pushNotifications";

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type QueuedPushNotificationStatus = "pending";

export type QueuedPushNotification = {
  walletAddress: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: QueuedPushNotificationStatus;
  attempts: number;
  createdAt: number;
  createdAtMs: number;
};

/**
 * Builds the Firestore document for a queued push notification. The wallet
 * address is lowercased to match the `firestore.rules` `pushNotifications`
 * create rule.
 */
export function buildQueuedPushNotification(
  walletAddress: string,
  payload: PushNotificationPayload,
  createdAtMs: number,
): QueuedPushNotification {
  return {
    walletAddress: walletAddress.trim().toLowerCase(),
    title: payload.title,
    body: payload.body,
    data: payload.data ? { ...payload.data } : {},
    status: "pending",
    attempts: 0,
    createdAt: createdAtMs,
    createdAtMs,
  };
}

/** Returns true when the notification has enough content to deliver. */
export function isDeliverablePushNotification(
  payload: PushNotificationPayload,
): boolean {
  return Boolean(payload.title?.trim() || payload.body?.trim());
}
