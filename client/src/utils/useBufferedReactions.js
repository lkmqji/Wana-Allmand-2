import { useState, useRef, useCallback, useEffect } from 'react';
import { generateBurstParticles } from './formatters';

/**
 * useBufferedReactions - High-velocity particle micro-buffering hook.
 * Queues particle bursts and flushes them onto requestAnimationFrame
 * to ensure 60 FPS rendering without React state congestion or visual tearing.
 *
 * @param {(() => void) | undefined} onBurstSound - Optional sound effect trigger
 * @returns {[Array<any>, (data: any) => void, React.Dispatch<React.SetStateAction<Array<any>>>]}
 */
export function useBufferedReactions(onBurstSound) {
  const [floatingReactions, setFloatingReactions] = useState([]);
  const pendingBufferRef = useRef([]);
  const rafIdRef = useRef(null);
  const timeoutsRef = useRef([]);

  const flushBuffer = useCallback(() => {
    if (pendingBufferRef.current.length === 0) {
      rafIdRef.current = null;
      return;
    }

    const newParticles = [...pendingBufferRef.current];
    pendingBufferRef.current = [];
    rafIdRef.current = null;

    setFloatingReactions(prev => [...prev, ...newParticles]);

    const idsToRemove = new Set(newParticles.map(p => p.id));
    const timeoutId = setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => !idsToRemove.has(r.id)));
    }, 2500);

    timeoutsRef.current.push(timeoutId);
  }, []);

  const addReaction = useCallback((data) => {
    if (typeof onBurstSound === 'function') {
      onBurstSound();
    }

    let particles = [];
    if (data?.particles && Array.isArray(data.particles)) {
      particles = data.particles;
    } else if (data?.emoji) {
      const generated = generateBurstParticles(data.emoji);
      particles = generated.particles || [];
    }

    if (particles.length > 0) {
      pendingBufferRef.current.push(...particles);

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(flushBuffer);
      }
    }
  }, [flushBuffer, onBurstSound]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  return [floatingReactions, addReaction, setFloatingReactions];
}

export default useBufferedReactions;
