import { useSyncExternalStore, useCallback } from 'react';

/**
 * Global Real-Time State Container
 * Decouples volatile WebSocket streams from the React root component tree
 * to eliminate Context Thrashing, Visual Tearing, and Root State Overload.
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

  // --- Mutators (Atomic Slices) ---
  setOnlineUsers(onlineUsers) {
    if (state.onlineUsers === onlineUsers) return;
    state = { ...state, onlineUsers: Array.isArray(onlineUsers) ? onlineUsers : [] };
    emitChange();
  },

  setSession(session) {
    if (state.session === session) return;
    const fullSession = typeof session === 'object' ? session : (session ? { id: session } : null);
    state = { 
      ...state, 
      session: fullSession,
      ...(fullSession?.players ? { players: fullSession.players } : {})
    };
    emitChange();
  },

  updateSession(updater) {
    const nextSession = typeof updater === 'function' ? updater(state.session) : updater;
    if (state.session === nextSession) return;
    state = { ...state, session: nextSession };
    emitChange();
  },

  setPlayers(players) {
    if (state.players === players) return;
    state = { ...state, players: players || {} };
    emitChange();
  },

  setIsHost(isHost) {
    const bool = Boolean(isHost);
    if (state.isHost === bool) return;
    state = { ...state, isHost: bool };
    emitChange();
  },

  setChatMessages(updater) {
    const nextMessages = typeof updater === 'function' ? updater(state.chatMessages) : updater;
    if (state.chatMessages === nextMessages) return;
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
    if (state.notifications === nextNotifs) return;
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
    if (state.unreadCount === nextCount) return;
    state = { ...state, unreadCount: Math.max(0, nextCount || 0) };
    emitChange();
  },

  setToastNotif(toastNotif) {
    if (state.toastNotif === toastNotif) return;
    state = { ...state, toastNotif };
    emitChange();
  },

  setIncomingInvite(incomingInvite) {
    if (state.incomingInvite === incomingInvite) return;
    state = { ...state, incomingInvite };
    emitChange();
  },

  setAnnouncement(announcement) {
    const str = announcement || '';
    if (state.announcement === str) return;
    state = { ...state, announcement: str };
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

/**
 * useRealtimeSelector - Generic selective subscription hook using useSyncExternalStore
 */
export function useRealtimeSelector(selector) {
  const getSnapshot = useCallback(() => selector(state), [selector]);
  return useSyncExternalStore(realtimeStore.subscribe, getSnapshot, getSnapshot);
}

// --- Dedicated O(1) Slice Hooks ---
export const useOnlineUsers = () => useRealtimeSelector(s => s.onlineUsers);
export const useSession = () => useRealtimeSelector(s => s.session);
export const usePlayers = () => useRealtimeSelector(s => s.players);
export const useIsHost = () => useRealtimeSelector(s => s.isHost);
export const useChatMessages = () => useRealtimeSelector(s => s.chatMessages);
export const useNotifications = () => useRealtimeSelector(s => s.notifications);
export const useUnreadCount = () => useRealtimeSelector(s => s.unreadCount);
export const useToastNotif = () => useRealtimeSelector(s => s.toastNotif);
export const useIncomingInvite = () => useRealtimeSelector(s => s.incomingInvite);
export const useAnnouncement = () => useRealtimeSelector(s => s.announcement);

export default realtimeStore;
