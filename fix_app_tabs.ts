import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/App.tsx', 'utf8');

// Replace activeTab with currentPage.startsWith('dashboard')
content = content.replace(/activeTab === "dashboard"/g, "currentPage.startsWith('dashboard')");

writeFileSync('src/App.tsx', content);
