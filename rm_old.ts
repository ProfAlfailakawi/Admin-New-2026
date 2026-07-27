import { existsSync, unlinkSync } from 'fs';
['server.mjs', 'src/server.mjs', 'server.js', 'src/server.js'].forEach(f => {
  if (existsSync(f)) {
    unlinkSync(f);
    console.log("Deleted", f);
  }
});
console.log("Done checking old servers");
