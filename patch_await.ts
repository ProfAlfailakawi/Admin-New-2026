import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('server.ts', 'utf8');

const regex = /\/\/ Vite middleware for development[\s\S]*app\.listen\(PORT,\s*"0\.0\.0\.0"[\s\S]*?\}\);/m;

const match = content.match(regex);
if (match) {
  content = content.replace(regex, `(async () => {\n  ${match[0].split('\n').join('\n  ')}\n})();`);
  writeFileSync('server.ts', content);
  console.log("Successfully wrapped top-level await in an async IIFE.");
} else {
  console.log("Could not find the target block.");
}
