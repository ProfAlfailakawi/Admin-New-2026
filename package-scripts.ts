import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.test = "vitest run";
pkg.scripts["test:watch"] = "vitest";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
