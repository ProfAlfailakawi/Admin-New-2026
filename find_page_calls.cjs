const fs = require('fs');
const execSync = require('child_process').execSync;

try {
  const output = execSync('grep -r "[A-Za-z]*Page" src/').toString();
  const lines = output.split('\n');
  const filtered = lines.filter(line => {
    // looking for 'SomePage(' or '{SomePage('
    return line.match(/[a-zA-Z]+Page\s*\(/) && !line.includes('=>') && !line.includes('React.FC');
  });
  console.log(filtered.join('\n'));
} catch (e) {
  console.log(e.toString());
}
