import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix the bad placement
content = content.replace(
  "sessionStorage.removeItem('hideSampleDataPrompt');\n    await logout();\n            setTimeout(() => {",
  "await logout();\n            setTimeout(() => {"
);

// Add to handleLogout
content = content.replace(
  "    await logout();\n    setIsAuthenticated(false);",
  "    sessionStorage.removeItem('hideSampleDataPrompt');\n    await logout();\n    setIsAuthenticated(false);"
);

fs.writeFileSync('src/App.tsx', content);

console.log("Patch 12 applied");
