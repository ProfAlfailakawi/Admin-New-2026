import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("const showSecondFloatingTools = (floatingToolRole === 'admin' || floatingToolRole === 'local') && showExecutiveFloatingTools;", "const showSecondFloatingTools = (floatingToolRole === 'admin') && showExecutiveFloatingTools;");
fs.writeFileSync('src/App.tsx', content);
