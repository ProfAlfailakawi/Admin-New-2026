import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('server.ts', 'utf8');

const targetStr = `db = getFirestore(appInstance);`;
const replacementStr = `
  let dbId;
  try {
    const cfg = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
    dbId = cfg.firestoreDatabaseId;
  } catch(e) {}
  db = getFirestore(appInstance, dbId || "(default)");
`;

content = content.replace(targetStr, replacementStr);

writeFileSync('server.ts', content);
