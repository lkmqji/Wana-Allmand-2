import { useEffect, useRef } from 'react';

/**
 * useSocketEvent - Synchronous Ref-Trampolining hook for real-time WebSocket event listeners.
 * Eliminates Stale Closures, prevents listener churn, and updates handler ref synchronously.
 *
 * @param {any} socket - Socket.IO client instance
 * @param {string} eventName - Name of the socket event
 * @param {(...args: any[]) => void} handler - Callback to execute with freshest closure state
 */
export function useSocketEvent(socket, eventName, handler) {
  const handlerRef = useRef(handler);
  // Keep the mutable ref pointing to the latest version of the handler synchronously
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !eventName) return;

    const listener = (...args) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(...args);
      }
    };

    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [socket, eventName]);
}

export default useSocketEvent;
