# alerts_worker_final_clean_v2 — READY 0200723670

هذا Worker الإشعارات التلقائية فقط. لا يلمس الواجهة ولا ملفات PWA.

الجذر الصحيح بعد فك الضغط يجب أن يحتوي مباشرة:

- README.md
- package.json
- package-lock.json
- server.mjs
- Dockerfile
- .dockerignore

الرفع اليدوي إلى Google Cloud Run من داخل نفس المجلد:

```bash
cd alerts_worker_READY_ROOT

gcloud run deploy alerts-worker \
  --source . \
  --region europe-west3 \
  --project gen-lang-client-0200723670 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_TEST_SECRET=123456,ALERTS_LOOKBACK_MINUTES=30,MAX_SEND_PER_RUN=10,ALERTS_START_FROM_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

بعد الرفع اختبر:

```bash
curl "CLOUD_RUN_URL/"
curl -X POST "CLOUD_RUN_URL/run-alerts?secret=123456" -H "Content-Type: application/json" -d '{"dryRun":true}'
```

ملاحظات:
- المشروع الصحيح: gen-lang-client-0200723670
- رابط الأدمن الصحيح: https://alturath-admin-0200723670.web.app
- لا ترفع node_modules.
