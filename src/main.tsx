// Cache Busting 2026-05-07
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
