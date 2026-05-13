const fs = require('fs');
const path = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/flex flex-col flex-col/g, 'flex flex-col');
content = content.replace(/w-\[calc\(100\%-2rem\)\] sm:w-full w-full max-w-none/g, 'w-full max-w-none');

fs.writeFileSync(path, content, 'utf8');
