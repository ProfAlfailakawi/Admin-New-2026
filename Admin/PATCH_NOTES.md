# PWA Push Fix Upload Package

## ارفع/استبدل هذا الملف

ضع هذا الملف في مشروع الموقع الحقيقي بنفس المسار:

```text
public/firebase-messaging-sw.js
```

يعني الملف داخل هذه الحزمة:

```text
public/firebase-messaging-sw.js
```

يستبدل الملف الموجود على الاستضافة/الريبو في نفس المكان.

## عدّل server.ts

الملف الثاني في الحزمة هو سكربت تعديل:

```text
scripts/patch-server-notifications.js
```

ضعه داخل المشروع، ثم من جذر المشروع شغّل:

```bash
node scripts/patch-server-notifications.js
```

هذا يعدّل `server.ts` حتى يرسل الإشعار كـ data-only، والـService Worker هو الذي يعرض الإشعار. هذا أفضل لـPWA خصوصًا على iPhone.

## بعد الرفع

1. Deploy / restart server.
2. من iPhone احذف PWA من الشاشة الرئيسية.
3. أضفه من جديد من Safari:
   Share → Add to Home Screen.
4. افتح PWA من الأيقونة.
5. اضغط تفعيل الإشعارات مرة ثانية.
6. جرّب طلب جديد.

## مهم جدًا

لا ترفع هذا الملف إلى الاستضافة العامة أو GitHub:

```text
secrets/serviceAccountKey.json
```

هذا مفتاح سري. إذا كان انرفع أو انرسل لأي مكان، ولّد مفتاح جديد من Firebase واحذف القديم.
