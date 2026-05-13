// Browser notification helpers. We only fire when the document is hidden so
// the user doesn't get a popup while they're already looking at Postly.

export function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => { /* user dismissed */ })
  }
}

interface NotifyOpts extends NotificationOptions {
  force?: boolean // fire even when the tab is focused
}

function notify(title: string, opts: NotifyOpts = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (!opts.force && document.visibilityState === 'visible') return
  try {
    new Notification(title, { icon: '/icon.svg', ...opts })
  } catch {
    /* some browsers block constructor in non-secure contexts — ignore */
  }
}

export function notifyPostPublished(platforms: string[]) {
  notify('Post published', { body: `Published to ${platforms.join(', ')}` })
}

export function notifyPostFailed(platforms: string[]) {
  notify('Post failed', { body: `Failed on ${platforms.join(', ')} — check Postly` })
}

export function notifyTokenExpiringSoon(platform: string, daysLeft: number) {
  notify(`${platform} token expiring`, {
    body: `Your ${platform} connection expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Reconnect to avoid interruption.`,
  })
}
