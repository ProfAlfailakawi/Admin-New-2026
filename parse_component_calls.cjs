const fs = require('fs');
const ts = require('typescript');

const files = [];
const findFiles = (dir) => {
  if(!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const p = dir + '/' + file;
    if (fs.statSync(p).isDirectory()) findFiles(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  });
};
findFiles('src');

const ignoredNames = new Set([
  'String', 'Number', 'Boolean', 'Date', 'Object', 'Array', 
  'Map', 'Set', 'URL', 'Error', 'Promise', 'Math', 'JSON', 
  'RegExp', 'Intl', 'FormData', 'Blob', 'File', 'Headers', 
  'Request', 'Response', 'Image', 'Audio', 'Worker', 'GoogleGenAI', 'Stripe'
]);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  
  const visit = (node) => {
     if (ts.isCallExpression(node)) {
        let name = '';
        if (ts.isIdentifier(node.expression)) {
            name = node.expression.text;
        }
        
        if (name && /^[A-Z]/.test(name) && !ignoredNames.has(name) && !name.includes('Error')) {
            console.log(`Potential function call of Component: ${name} in ${file} at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
     }
     ts.forEachChild(node, visit);
  };
  visit(sourceFile);
});
