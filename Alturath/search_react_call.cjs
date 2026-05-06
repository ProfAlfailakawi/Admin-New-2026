const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.match(/[A-Z][a-zA-Z0-9_]+\(/) && !line.includes('React.') && !line.includes('new ')) {
                    if (!line.includes('Date(') && !line.includes('Number(') && !line.includes('String(') && !line.includes('Boolean(') && !line.includes('Math.')) {
                        console.log(`${fullPath}:${i+1}: ${line.trim()}`);
                    }
                }
            });
        }
    }
}

search('src');
