// واجهة تشغيل ضغط نسخة المرآة المحلية داخل Web Worker (خارج الخيط الرئيسي).
// الهدف: منع تجميد الواجهة الناتج عن LZString.compressToBase64 على بيانات ضخمة.
//
// التصميم آمن بالكامل:
//  - لو لم يدعم المتصفح الـWorker أو فشل إنشاؤه، نُعيد null ليستخدم المنادي المسار
//    الاحتياطي المتزامن القديم نفسه (سلوك مطابق، بلا أي تغيير وظيفي).
//  - الـWorker يُنشأ مرة واحدة بكسل (lazy) ويُعاد استخدامه.

let worker: Worker | null = null;
let workerUnavailable = false;
let seq = 0;
const pending = new Map<number, (value: string | null) => void>();

function getWorker(): Worker | null {
  if (workerUnavailable) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') {
    workerUnavailable = true;
    return null;
  }
  try {
    worker = new Worker(new URL('./snapshotCompressor.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent) => {
      const { id, result } = (event.data || {}) as { id?: number; result?: string | null };
      if (typeof id !== 'number') return;
      const resolve = pending.get(id);
      if (resolve) {
        pending.delete(id);
        resolve(result ?? null);
      }
    };
    worker.onerror = () => {
      // عند تعطّل الـWorker: علّمه غير متاح، وأسقط كل الطلبات المعلّقة على المسار الاحتياطي.
      workerUnavailable = true;
      pending.forEach((resolve) => resolve(null));
      pending.clear();
      try { worker?.terminate(); } catch {}
      worker = null;
    };
    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

/**
 * يضغط النص داخل الـWorker ويُعيد base64 خام (بلا بادئة).
 * يُعيد null فقط حين يكون الـWorker غير متاح، ليقوم المنادي بالضغط المتزامن الاحتياطي.
 * يستخدمه: نسخة المرآة المحلية (تضيف 'lz64:')، وحفظ الـshards للسحابة (مباشرةً).
 */
export function compressToBase64ViaWorker(text: string): Promise<string | null> {
  const activeWorker = getWorker();
  if (!activeWorker) return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    try {
      activeWorker.postMessage({ id, text });
    } catch {
      pending.delete(id);
      resolve(null);
    }
  });
}
