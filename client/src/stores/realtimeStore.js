import { useSyncExternalStore } from 'react';

/**
 * Global Real-Time State Container (uSES)
 * Fully compatible with direct values AND React-style (prev => ...) updater callbacks.
 */

let state = {
  onlineUsers: [],
  session: null,
  players: {},
  isHost: false,
  chatMessages: [],
  notifications: [],
  unreadCount: 0,
  toastNotif: null,
  incomingInvite: null,
  announcement: ''
};

const listeners = new Set();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const realtimeStore = {
  // --- Core uSES API ---
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot() {
    return state;
  },

  // --- Mutators (Atomic Slices, supporting both direct values & functional updaters) ---
  setOnlineUsers(usersOrUpdater) {
    const nextUsers = typeof usersOrUpdater === 'function' ? usersOrUpdater(state.onlineUsers) : usersOrUpdater;
    state = { ...state, onlineUsers: Array.isArray(nextUsers) ? nextUsers : [] };
    emitChange();
  },

  setSession(sessionOrUpdater) {
    const next = typeof sessionOrUpdater === 'function' ? sessionOrUpdater(state.session) : sessionOrUpdater;
    const fullSession = typeof next === 'object' ? next : (next ? { id: next } : null);
    state = { 
      ...state, 
      session: fullSession,
      ...(fullSession?.players ? { players: fullSession.players } : {})
    };
    emitChange();
  },

  updateSession(updater) {
    const nextSession = typeof updater === 'function' ? updater(state.session) : updater;
    state = { ...state, session: nextSession };
    emitChange();
  },

  setPlayers(playersOrUpdater) {
    const nextPlayers = typeof playersOrUpdater === 'function' ? playersOrUpdater(state.players) : playersOrUpdater;
    state = { ...state, players: nextPlayers || {} };
    emitChange();
  },

  setIsHost(isHostOrUpdater) {
    const nextIsHost = typeof isHostOrUpdater === 'function' ? isHostOrUpdater(state.isHost) : isHostOrUpdater;
    state = { ...state, isHost: Boolean(nextIsHost) };
    emitChange();
  },

  setChatMessages(updater) {
    const nextMessages = typeof updater === 'function' ? updater(state.chatMessages) : updater;
    state = { ...state, chatMessages: Array.isArray(nextMessages) ? nextMessages : [] };
    emitChange();
  },

  addChatMessage(msg) {
    if (!msg) return;
    if (msg.id && state.chatMessages.some(m => m.id === msg.id)) return;
    state = { ...state, chatMessages: [...state.chatMessages, msg] };
    emitChange();
  },

  setNotifications(updater) {
    const nextNotifs = typeof updater === 'function' ? updater(state.notifications) : updater;
    state = { ...state, notifications: Array.isArray(nextNotifs) ? nextNotifs : [] };
    emitChange();
  },

  addNotification(notif) {
    if (!notif) return;
    state = {
      ...state,
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
    emitChange();
  },

  setUnreadCount(updater) {
    const nextCount = typeof updater === 'function' ? updater(state.unreadCount) : updater;
    state = { ...state, unreadCount: Math.max(0, nextCount || 0) };
    emitChange();
  },

  setToastNotif(toastOrUpdater) {
    const nextToast = typeof toastOrUpdater === 'function' ? toastOrUpdater(state.toastNotif) : toastOrUpdater;
    state = { ...state, toastNotif: nextToast };
    emitChange();
  },

  setIncomingInvite(inviteOrUpdater) {
    const nextInvite = typeof inviteOrUpdater === 'function' ? inviteOrUpdater(state.incomingInvite) : inviteOrUpdater;
    state = { ...state, incomingInvite: nextInvite };
    emitChange();
  },

  setAnnouncement(announcementOrUpdater) {
    const next = typeof announcementOrUpdater === 'function' ? announcementOrUpdater(state.announcement) : announcementOrUpdater;
    state = { ...state, announcement: next || '' };
    emitChange();
  },

  resetSession() {
    state = {
      ...state,
      session: null,
      players: {},
      isHost: false,
      chatMessages: []
    };
    emitChange();
  }
};

// --- Referentially Stable Static Selectors ---
const selectOnlineUsers = () => state.onlineUsers;
const selectSession = () => state.session;
const selectPlayers = () => state.players;
const selectIsHost = () => state.isHost;
const selectChatMessages = () => state.chatMessages;
const selectNotifications = () => state.notifications;
const selectUnreadCount = () => state.unreadCount;
const selectToastNotif = () => state.toastNotif;
const selectIncomingInvite = () => state.incomingInvite;
const selectAnnouncement = () => state.announcement;

// --- Dedicated O(1) Slice Hooks with Guaranteed Stability ---
export const useOnlineUsers = () => useSyncExternalStore(realtimeStore.subscribe, selectOnlineUsers, selectOnlineUsers);
export const useSession = () => useSyncExternalStore(realtimeStore.subscribe, selectSession, selectSession);
export const usePlayers = () => useSyncExternalStore(realtimeStore.subscribe, selectPlayers, selectPlayers);
export const useIsHost = () => useSyncExternalStore(realtimeStore.subscribe, selectIsHost, selectIsHost);
export const useChatMessages = () => useSyncExternalStore(realtimeStore.subscribe, selectChatMessages, selectChatMessages);
export const useNotifications = () => useSyncExternalStore(realtimeStore.subscribe, selectNotifications, selectNotifications);
export const useUnreadCount = () => useSyncExternalStore(realtimeStore.subscribe, selectUnreadCount, selectUnreadCount);
export const useToastNotif = () => useSyncExternalStore(realtimeStore.subscribe, selectToastNotif, selectToastNotif);
export const useIncomingInvite = () => useSyncExternalStore(realtimeStore.subscribe, selectIncomingInvite, selectIncomingInvite);
export const useAnnouncement = () => useSyncExternalStore(realtimeStore.subscribe, selectAnnouncement, selectAnnouncement);

export default realtimeStore;
