/*
 * حارس انحدار مدخل العرض التجريبي (Google Play reviewers).
 *
 * يتحقق ساكناً من أن: (1) شاشة الدخول فيها زر العرض ويستدعي enterDemoMode،
 * (2) حارس الشبكة يُركَّب عند استيراد demoMode قبل Firebase، ويفشل مغلقاً
 * (fetch/XHR/WebSocket/EventSource/sendBeacon)، (3) شريط «نسخة تجريبية» ظاهر،
 * (4) firebase.ts يعطّل شبكة Firestore في العرض، (5) الدخول لا يلمس مصادقة الموظفين.
 * الفحص الديناميكي (صفر نداءات حقيقية) في src/tests/demoNetworkGuard.test.ts.
 */
import fs from 'node:fs';
const read = (f) => fs.readFileSync(f, 'utf8');
const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };

const login = read('src/components/Login.tsx');
need(login.includes('enterDemoMode()') && login.includes('data-testid="enter-demo"'), 'شاشة الدخول لا تعرض زر النسخة التجريبية');
need(login.includes('جرّب النسخة التجريبية'), 'نص زر العرض مفقود');

const mode = read('src/lib/demoMode.ts');
for (const k of ['window.fetch =', 'XMLHttpRequest.prototype.open', 'WebSocket', 'EventSource', 'sendBeacon', '__ktkDemoBlocked']) {
  need(mode.includes(k), `حارس الشبكة لا يغطي: ${k}`);
}
need(/\ninstallDemoNetworkGuard\(\);\s*$/.test(mode), 'حارس الشبكة لا يُركَّب ذاتياً عند استيراد demoMode');
need(/record\('fetch'/.test(mode), 'fetch الخارجي لا يُرفض ويُسجَّل');

const main = read('src/main.tsx');
const mi = main.indexOf("import './lib/demoMode'");
need(mi !== -1, "main.tsx لا يستورد demoMode");
need(mi < main.indexOf("from './App"), 'demoMode يجب أن يُستورد قبل App/Firebase');

need(read('src/firebase.ts').includes('disableNetwork(db)'), 'firebase.ts لا يعطّل شبكة Firestore في العرض');

const app = read('src/App.tsx');
need(app.includes('{IS_DEMO_MODE && <DemoBanner />}'), 'شريط «نسخة تجريبية» غير معروض');
need(/useState<'admin' \| 'partner' \| null>\(IS_DEMO_MODE \? 'admin' : null\)/.test(app), 'دور العرض تغيّر');

if (errors.length) {
  for (const e of errors) console.error('فشل فحص مدخل العرض: ' + e);
  process.exit(1);
}
console.log('verify-demo-entry: OK');
