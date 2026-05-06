const fs = require('fs');
const execSync = require('child_process').execSync;

try {
  const output = execSync('grep -r "[A-Z][a-zA-Z]*(" src/components/').toString();
  const lines = output.split('\n');
  const filtered = lines.filter(line => {
    return !line.includes('React.') && 
           !line.includes('Math.') && 
           !line.includes('Date(') && 
           !line.includes('Date.') && 
           !line.includes('Number(') && 
           !line.includes('Object.') && 
           !line.includes('Array.') && 
           !line.includes('JSON.') && 
           !line.includes('Map(') && 
           !line.includes('Set(') && 
           !line.includes('Promise.all') && 
           !line.includes('String(');
  });
  console.log(filtered.slice(0, 50).join('\n'));
} catch (e) {
  console.log(e.toString());
}
