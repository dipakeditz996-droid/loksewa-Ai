// Cross-component sync for notification read-state. The bell (NotificationBell)
// keeps its own polled state, separate from the full inbox pages
// (NotificationsInbox, StudentNotificationCenter) - without this, marking a
// notification read on an inbox page wouldn't update the bell's badge until
// its next 3-minute poll.
const EVENT_NAME = "notifications-changed";

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onNotificationsChanged(handler: () => void) {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
