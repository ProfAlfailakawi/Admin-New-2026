import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('server.ts', 'utf8');

const targetStr = `  const appInstance = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0200723670",
      });`;

const replaceStr = `
  let cfg: any = {};
  try {
    cfg = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
  } catch(e) {}

  const projectId = cfg.projectId || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0200723670";

  const appInstance = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        projectId: projectId,
      });
`;

content = content.replace(targetStr, replaceStr);
writeFileSync('server.ts', content);
console.log("Updated Admin SDK projectId logic");
