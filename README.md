# alerts_worker_final_clean_v2

Worker نظيف. لا deploy من Downloads. لازم deploy من داخل هذا المجلد فقط.

```bash
cd ~/Downloads/alerts_worker_final_clean_v2
gcloud run deploy alerts-worker \
  --source . \
  --region europe-west3 \
  --project gen-lang-client-0200723670 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_TEST_SECRET=123456,ALERTS_LOOKBACK_MINUTES=30,MAX_SEND_PER_RUN=5,ALERTS_START_FROM_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

بعدها:
```bash
curl "<Cloud Run URL بعد الرفع>"
```
لازم ترى `alerts-worker-final-clean-v2`.


## تعديل 0200723670
- تم تغيير fallback projectId إلى `gen-lang-client-0200723670`.
- تم تغيير روابط التنبيه من `https://admin.alturathkw.shop` إلى `https://alturath-admin-0200723670.web.app`.
- لا ترفع `node_modules`.
