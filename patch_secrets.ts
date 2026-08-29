import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace('const ALERTS_ADMIN_TEST_SECRET = process.env.ADMIN_TEST_SECRET || "123456";', 'const ALERTS_ADMIN_TEST_SECRET = process.env.ADMIN_TEST_SECRET || "";');
fs.writeFileSync('server.ts', content);
