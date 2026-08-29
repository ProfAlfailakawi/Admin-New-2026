echo "--- Package.json tests ---"
cat package.json | jq .scripts
echo "--- Vite Config ---"
cat vite.config.ts
