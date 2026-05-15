import { existsSync, unlinkSync } from 'fs';

const oldFiles = [
  'server.mjs',
  'src/server.mjs',
  'api/server.mjs',
  'server.js',
];

for (const file of oldFiles) {
  if (existsSync(file)) {
    unlinkSync(file);
    console.log(`Deleted ${file}`);
  }
}
console.log('Cleanup done');
