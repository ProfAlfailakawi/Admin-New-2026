import React from 'react';
import { exitDemoMode } from '../lib/demoMode';

/** Always-visible strip in demo mode so it can never be mistaken for a real session. */
const DemoBanner: React.FC = () => (
  <div
    dir="rtl"
    role="status"
    data-testid="demo-banner"
    className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-slate-900 shadow-2xl max-w-[95vw]"
  >
    <span>نسخة تجريبية — بيانات وهمية معزولة، لا ترتبط بأي طلبات أو عملاء أو مدفوعات حقيقية</span>
    <button
      type="button"
      onClick={exitDemoMode}
      className="rounded-full bg-slate-900 px-3 py-1 text-white whitespace-nowrap"
    >
      خروج
    </button>
  </div>
);

export default DemoBanner;
