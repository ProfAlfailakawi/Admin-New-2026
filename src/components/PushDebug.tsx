import React, { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { RESOLVED_VAPID_KEY } from '../lib/pushNotifications';

const PushDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [swFetchResult, setSwFetchResult] = useState<any>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    setDebugInfo({
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      notificationSupported: 'Notification' in window,
      swSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      permission: 'Notification' in window ? Notification.permission : 'not-supported',
      isStandalone,
      isIOS,
      vapidKeyPresent: !!RESOLVED_VAPID_KEY,
      vapidKeyLength: RESOLVED_VAPID_KEY ? RESOLVED_VAPID_KEY.length : 0,
      vapidPrefix: RESOLVED_VAPID_KEY ? RESOLVED_VAPID_KEY.substring(0, 8) : 'MISSING',
      firebase: {
        projectId: firebaseConfig.projectId,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      }
    });

    // Test SW availability
    fetch('/firebase-messaging-sw.js')
      .then(async (res) => {
        const text = await res.text();
        setSwFetchResult({
          status: res.status,
          contentType: res.headers.get('content-type'),
          isJS: res.headers.get('content-type')?.includes('javascript'),
          isHTML: text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html'),
          first50Chars: text.substring(0, 50)
        });
      })
      .catch(err => setSwFetchResult({ error: err.message }));

  }, []);

  const runFullTest = async () => {
    setLoading(true);
    setTokenResult(null);
    setRegistrationResult(null);

    if (!RESOLVED_VAPID_KEY) {
      setTokenResult({ error: "RESOLVED_VAPID_KEY is missing" });
      setLoading(false);
      return;
    }

    try {
      // 1. Service Worker Registration
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      setRegistrationResult({
        status: 'registered',
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      });

      // 2. Get Token
      const token = await getToken(messaging, {
        vapidKey: RESOLVED_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      setTokenResult({ token: token.substring(0, 10) + '...' });

    } catch (err: any) {
      setTokenResult({
        error: true,
        message: err.message,
        code: err.code,
        stack: err.stack,
        raw: JSON.stringify(err)
      });
    } finally {
      setLoading(false);
    }
  };

  const isIOSAndNotStandalone = debugInfo.isIOS && !debugInfo.isStandalone;

  return (
    <div className="p-6 font-mono text-xs bg-slate-900 text-green-400 min-h-screen overflow-auto" dir="ltr">
      <h1 className="text-xl font-bold mb-4 border-b border-green-800 pb-2 flex items-center gap-2">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        PUSH NOTIFICATION DEBUGGER
      </h1>

      {isIOSAndNotStandalone && (
        <div className="bg-amber-900/50 border border-amber-500 p-4 rounded-lg mb-6 text-amber-200">
          <p className="font-bold text-sm">⚠️ iOS ATTENTION:</p>
          <p>Push Notifications on iOS require the app to be added to the Home Screen.</p>
          <p className="mt-2 text-white bg-amber-600 px-2 py-1 rounded inline-block">
            افتح التطبيق من أيقونة الشاشة الرئيسية وليس من Safari.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h2 className="text-white font-bold mb-2 uppercase">Browser Environment</h2>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </section>

        <section className="bg-slate-800/50 p-4 rounded border border-slate-700">
          <h2 className="text-white font-bold mb-2 uppercase">Service Worker File (/firebase-messaging-sw.js)</h2>
          {swFetchResult ? (
            <pre className={swFetchResult.isHTML ? 'text-red-400' : ''}>
              {JSON.stringify(swFetchResult, null, 2)}
              {swFetchResult.isHTML && "\n\n❌ ERROR: FILE IS RETURNING HTML (probably index.html) instead of JavaScript!"}
            </pre>
          ) : 'Fetching...'}
        </section>

        <section className="col-span-1 md:col-span-2 mt-4">
          <button 
            onClick={runFullTest}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'RUNNING DIAGNOSTICS...' : '🚀 START PUSH REGISTRATION TEST'}
          </button>
        </section>

        {registrationResult && (
          <section className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <h2 className="text-white font-bold mb-2 uppercase">SW Registration Result</h2>
            <pre>{JSON.stringify(registrationResult, null, 2)}</pre>
          </section>
        )}

        {tokenResult && (
          <section className={`col-span-1 md:col-span-2 p-4 rounded border ${tokenResult.error ? 'bg-red-900/30 border-red-500' : 'bg-green-900/30 border-green-500'}`}>
            <h2 className="text-white font-bold mb-2 uppercase">Final Result</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(tokenResult, null, 2)}
            </pre>
          </section>
        )}
      </div>

      <div className="mt-8 text-slate-500 text-[10px]">
        Turaath Bi Engine - Push Diagnostic Tool v1.0
      </div>
    </div>
  );
};

export default PushDebug;
