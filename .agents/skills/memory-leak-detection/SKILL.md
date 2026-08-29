---
name: memory-leak-detection
description: Specialized skill to diagnose, trace, and resolve memory leaks in JavaScript/TypeScript applications, particularly in React components, WebSockets, Audio Managers (Web Audio API / Howler), DOM event listeners, and Node.js backend streams.
---

# Memory Leak Detection & Resolution Skill

This skill provides precise diagnostic workflows, detection patterns, and mitigation techniques for identifying and fixing memory leaks in fullstack JavaScript/TypeScript web applications.

---

## Key Triggers & Vulnerable Areas

Activate this skill when investigating:
1. **Audio Manager Leaks**: Unclosed `AudioContext`, unreleased `AudioBufferSourceNode`, lingering Howler.js sound instances, unmute/mute listeners attached to window.
2. **WebSocket & Network Leaks**: WebSockets retaining message listeners across re-renders, unclosed connections on unmount, unhandled reconnection backoff loops retaining state closures.
3. **React Lifecycle & Hook Leaks**: `useEffect` missing cleanup functions, setState on unmounted components, stale closures retaining large payload objects in `useCallback` or `useMemo`.
4. **Event Listeners & Timers**: `addEventListener` without `removeEventListener`, lingering `setInterval` / `setTimeout` / `requestAnimationFrame` IDs.
5. **Node.js & Backend Leaks**: `EventEmitter` listeners exceeding max count (`MaxListenersExceededWarning`), unclosed MongoDB change streams or cursors, global cache objects growing indefinitely without TTL/LRU eviction.

---

## 1. Diagnostic & Profiling Procedures

### A. Chrome DevTools Heap Snapshots
1. Open DevTools -> **Memory** tab.
2. Select **Heap snapshot** -> Click **Take snapshot** (Snapshot 1 - baseline).
3. Perform the suspected action repeatedly (e.g. navigate back and forth, play/stop audio, open/close WebSocket).
4. Take **Snapshot 2**.
5. Switch view from *Summary* to *Comparison* (comparing Snapshot 2 against Snapshot 1).
6. Sort by `# Delta` and `Alloc. Size`:
   - Inspect constructor names like `(closure)`, `WebSocket`, `AudioContext`, `HTMLDivElement`, `Detached HTMLElement`.
   - Inspect the **Retainers** tree to find the root reference preventing Garbage Collection (GC).

### B. Allocation Instrumentation on Timeline
1. Under DevTools **Memory**, select **Allocation instrumentation on timeline**.
2. Start recording, perform user actions, and look for blue/grey spikes. Blue spikes that never turn grey represent allocated objects that were never garbage-collected.

### C. Node.js Memory Inspection
- Run Node with `--inspect` or `--expose-gc` flags.
- Use `process.memoryUsage()` logging:
```javascript
const mem = process.memoryUsage();
console.log(`Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB / Total: ${Math.round(mem.heapTotal / 1024 / 1024)} MB`);
```

---

## 2. Common Patterns & Fixes

### Pattern 1: Web Audio API & Audio Manager Cleanup
**Bug:**
```javascript
// ❌ Leak: Creates new AudioContext or source on every sound without closing or disconnecting
function playSound(buffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}
```
**Fix:**
```javascript
// ✅ Fix: Singleton AudioContext + disconnect nodes when finished
class SoundEngine {
  private static ctx: AudioContext | null = null;

  static getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  static playSound(buffer: AudioBuffer) {
    const ctx = this.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      source.disconnect();
    };
    source.start();
  }

  static dispose() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
```

---

### Pattern 2: WebSocket Connection & Event Lifecycle in React
**Bug:**
```javascript
// ❌ Leak: New socket created on re-renders, event listeners pile up on window/socket
useEffect(() => {
  const socket = new WebSocket(url);
  socket.onmessage = (e) => setData(JSON.parse(e.data));
  // Missing cleanup: socket remains open after component unmounts
}, []);
```
**Fix:**
```javascript
// ✅ Fix: Graceful closure & listener detachment on unmount
useEffect(() => {
  let isMounted = true;
  const socket = new WebSocket(url);

  const handleMessage = (event: MessageEvent) => {
    if (!isMounted) return;
    try {
      const data = JSON.parse(event.data);
      setData(data);
    } catch (err) {
      console.error('Failed to parse WS payload', err);
    }
  };

  socket.addEventListener('message', handleMessage);

  return () => {
    isMounted = false;
    socket.removeEventListener('message', handleMessage);
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(1000, 'Component unmounted');
    }
  };
}, [url]);
```

---

### Pattern 3: AbortController for Async Fetch & Event Streams
**Fix:**
```javascript
useEffect(() => {
  const controller = new AbortController();
  
  async function loadData() {
    try {
      const res = await fetch('/api/data', { signal: controller.signal });
      const json = await res.json();
      setState(json);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    }
  }

  loadData();

  return () => {
    controller.abort();
  };
}, []);
```

---

### Pattern 4: Global Event Listeners & Timers
**Fix:**
```javascript
useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth);
  window.addEventListener('resize', handleResize, { passive: true });
  
  const timer = setInterval(() => {
    // interval task
  }, 1000);

  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
  };
}, []);
```

---

### Pattern 5: Caches & Unbounded Map/Set Collections
**Fix:**
- Always use `WeakMap` or `WeakSet` when keys are DOM elements or object instances to allow automatic GC.
- For in-memory caches, use an LRU cache (e.g. `lru-cache`) with explicit `max` item limit and `ttl`.
