'use client';

/**
 * Notification Manager — handles browser push notifications
 * alongside existing in-app toasts and alert banners.
 */

let permissionGranted = false;

/** Request browser notification permission (call once on mount) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') { permissionGranted = true; return true; }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

/** Send a browser push notification (works even when tab is in background) */
export function sendBrowserNotification(title: string, body: string, options?: { tag?: string; icon?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || title, // prevents duplicate notifications with same tag
      requireInteraction: false,
    });
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
  } catch {
    // Fallback: some browsers block Notification constructor in service-worker-less contexts
  }
}

/** Play a short notification chime */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880; // A5 note
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}

/** Combined: send browser notification + play sound */
export function notifyCritical(title: string, body: string, tag?: string) {
  sendBrowserNotification(title, body, { tag });
  playNotificationSound();
}
