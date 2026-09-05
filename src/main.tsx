// Cache Busting 2026-05-07
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { installLocalStorageDataGuard } from './lib/dataGuard';
import App from './App.tsx';
import './index.css';

installLocalStorageDataGuard();

// Register the offline app-shell service worker unconditionally on load so the
// console works offline and installs as a real PWA. This is separate from
// firebase-messaging-sw.js, which is registered lazily only when the user opts
// into push notifications.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => {
        console.warn('Offline service worker registration failed:', err);
      });
  });
}

// Clear previous IDB crash flag after 5 seconds of successful boot
setTimeout(() => {
  sessionStorage.removeItem('idb_crash_reloaded');
}, 5000);

// Handle Safari/PWA IndexedDB crash
const handleIndexedDBError = (message: string, event: Event) => {
  if (message.includes('Connection to Indexed Database server lost')) {
    event.preventDefault();
    console.error("IndexedDB connection lost detected.");
    if (!sessionStorage.getItem('idb_crash_reloaded')) {
      sessionStorage.setItem('idb_crash_reloaded', 'true');
      setTimeout(() => window.location.reload(), 500);
    }
  }
};

window.addEventListener('error', (event) => {
  handleIndexedDBError(event.message || '', event);
});

window.addEventListener('unhandledrejection', (event) => {
  handleIndexedDBError(event.reason?.message || '', event);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Local AI self-training is optional background work. Loading it synchronously held
// the first paint behind code that the user cannot see. Start it after the shell has
// rendered; the timeout fallback keeps the behavior on Safari where idle callbacks
// may be unavailable.
const startAILearning = () => {
  void import('./lib/aiLearningCore')
    .then(({ installAISelfTrainingScheduler }) => installAISelfTrainingScheduler())
    .catch(() => {});
};
if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(startAILearning, { timeout: 1500 });
} else {
  window.setTimeout(startAILearning, 700);
}
