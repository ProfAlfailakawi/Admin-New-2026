import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Ensure import 
if (!content.includes('import { playSuccessAction }')) {
  content = content.replace(
    "import { AppState, Notification } from './types';",
    "import { AppState, Notification } from './types';\nimport { playSuccessAction } from './lib/sonic';"
  );
}

const addToastReplacement = `  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (type === 'success') {
      playSuccessAction();
    }
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,`;

content = content.replace(
`  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,`,
addToastReplacement
);

// Pulse orb for System Pulse
// Find the header where we have the user icon, search for <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-slate-50 border border-slate-100 shrink-0" title={appMode === 'cloud' ? "تم الاتصال بالسحابة" : "تعمل بوضع غير متصل"}>

const systemPulseReplacement = `            <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-slate-50 border border-slate-100 shrink-0" title={appMode === 'cloud' ? "الوضع السحابي شغال" : "تعمل بوضع غير متصل"}>
              {dataLoading ? (
                 <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className={cn("w-2.5 h-2.5 rounded-full absolute", 
                       (data.orders && data.orders.filter(o => o.status === 'pending' || o.status === 'failed').length > 0) ? "bg-amber-500 animate-ping opacity-75" : "bg-emerald-500 opacity-60",
                       appMode !== 'cloud' ? "!bg-red-500 animate-pulse" : "")} />
                  <div className={cn("w-2 h-2 rounded-full relative z-10", 
                       (data.orders && data.orders.filter(o => o.status === 'pending' || o.status === 'failed').length > 0) ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse",
                       appMode !== 'cloud' ? "!bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "")} />
                </div>
              )}
            </div>`;

content = content.replace(
`            <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-slate-50 border border-slate-100 shrink-0" title={appMode === 'cloud' ? "تم الاتصال بالسحابة" : "تعمل بوضع غير متصل"}>
               {dataLoading ? (
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
               ) : (
                  <div className={cn("w-2 h-2 rounded-full", appMode === 'cloud' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]")} />
               )}
            </div>`,
systemPulseReplacement
);


fs.writeFileSync('src/App.tsx', content);

