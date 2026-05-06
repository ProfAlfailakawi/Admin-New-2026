const fs = require('fs');
const ts = require('typescript');

const files = [];
const findFiles = (dir) => {
  if(!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const p = dir + '/' + file;
    if (fs.statSync(p).isDirectory()) findFiles(p);
    else if (p.endsWith('.tsx')) files.push(p);
  });
};
findFiles('src');

let invalidHooks = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  
  const visit = (node, path) => {
     if (ts.isCallExpression(node) && node.expression) {
        let name = '';
        if (ts.isIdentifier(node.expression)) {
            name = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
            name = node.expression.name.text;
        }
        
        if (name === 'useState' || name === 'useEffect' || name === 'useMemo' || name === 'useCallback' || name === 'useRef') {
            // Check enclosing functions
            let current = node.parent;
            let funcs = [];
            while(current) {
                if (ts.isFunctionDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
                    // Try to get name
                    let funcName = '?';
                    if (current.name) {
                        funcName = current.name.text;
                    } else if (current.parent && ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
                        funcName = current.parent.name.text;
                    } else if (current.parent && ts.isCallExpression(current.parent) && ts.isIdentifier(current.parent.expression)) {
                        funcName = `CallbackOf_${current.parent.expression.text}`;
                    } else if (current.parent && current.parent.parent && ts.isVariableDeclaration(current.parent.parent) && ts.isIdentifier(current.parent.parent.name)) {
                        // React.memo(...) case
                        funcName = current.parent.parent.name.text;
                    }
                    funcs.push(funcName);
                }
                current = current.parent;
            }
            if(funcs.length > 0) {
               invalidHooks.push(`${file}: ${name} inside ${funcs[0]} at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            } else {
               invalidHooks.push(`${file}: ${name} NOT inside any function at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            }
        }
     }
     ts.forEachChild(node, child => visit(child, [...path, node]));
  };
  visit(sourceFile, []);
});

console.log(invalidHooks.join('\n'));
