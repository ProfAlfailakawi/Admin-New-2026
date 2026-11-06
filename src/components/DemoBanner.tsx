import React from 'react';
import { exitDemoMode } from '../lib/demoMode';

/** Always-visible strip in demo mode so it can never be mistaken for a real session.
 *  Layout lives in index.css (.demo-banner): a slim pill that sits in the safe area and
 *  shortens its sentence on narrow windows (folded Duo, Split View 320) instead of wrapping to 4 lines. */
const DemoBanner: React.FC = () => (
  <div
    dir="rtl"
    role="status"
    data-testid="demo-banner"
    className="demo-banner"
  >
    <span className="demo-banner__text">
      <span className="demo-banner__long">نسخة تجريبية — بيانات وهمية معزولة، لا ترتبط بأي طلبات أو عملاء أو مدفوعات حقيقية</span>
      <span className="demo-banner__short">نسخة تجريبية — بيانات وهمية</span>
    </span>
    <button type="button" onClick={exitDemoMode} className="demo-banner__exit">
      خروج
    </button>
  </div>
);

export default DemoBanner;
