// Cache Busting 2026-05-07
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { installLocalStorageDataGuard } from './lib/dataGuard';
import App from './App.tsx';
import './index.css';
import './components/dna/dna.css';
import './components/dna/dna-theme.css';
import { installAppUpdate, registrationHoldsPushWorker } from './lib/app-update';
import { installMobileTableCards } from './lib/mobileTableCards';

installLocalStorageDataGuard();
// Phone layout: label wide-table cells so they can render as stacked cards (CSS-only on mobile).
installMobileTableCards();

// التحديث الذاتي الصامت: بصمة الإصدار، منارتها، ثم التحديث والتصعيد عند اللزوم.
installAppUpdate();

// Register the offline app-shell service worker on load so the console works
// offline and installs as a real PWA. firebase-messaging-sw.js is registered
// lazily when the user opts into push notifications, on the same scope "/".
// A scope holds one worker, so registering the shell over the messaging worker
// replaces it with one that has no push handler and notifications stop showing.
// Once the messaging worker holds "/", it stays.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (registrationHoldsPushWorker(existing)) return;
      await navigator.serviceWorker.register('/service-worker.js');
    } catch (err) {
      console.warn('Offline service worker registration failed:', err);
    }
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
