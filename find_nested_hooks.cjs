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

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  
  const visit = (node) => {
     if (ts.isCallExpression(node) && node.expression) {
        let name = '';
        if (ts.isIdentifier(node.expression)) {
            name = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
            name = node.expression.name.text;
        }
        
        if (name === 'useState' || name === 'useEffect' || name === 'useMemo' || name === 'useCallback' || name === 'useRef') {
            // Find component body
            let current = node.parent;
            let invalid = false;
            let failReason = '';
            
            while(current) {
                if (ts.isBlock(current)) {
                    // ok
                } else if (ts.isIfStatement(current) || ts.isForStatement(current) || ts.isWhileStatement(current) || ts.isDoStatement(current) || ts.isSwitchStatement(current)) {
                    invalid = true;
                    failReason = 'inside conditional/loop';
                    break;
                } else if (ts.isArrowFunction(current) || ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current)) {
                    // Found a function boundary.
                    // Is this function a component or custom hook?
                    let isComponent = false;
                    let funcName = '?';
                    if (current.name) {
                        funcName = current.name.text;
                    } else if (current.parent && ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
                        funcName = current.parent.name.text;
                    } else if (current.parent && current.parent.parent && ts.isVariableDeclaration(current.parent.parent) && ts.isIdentifier(current.parent.parent.name)) {
                        funcName = current.parent.parent.name.text;
                    }

                    if (current.parent && ts.isJsxExpression(current.parent)) {
                        funcName = 'JsxAttributeCallback';
                    } else if (current.parent && ts.isCallExpression(current.parent)) {
                        if (ts.isIdentifier(current.parent.expression)) {
                            funcName = `CallbackOf_${current.parent.expression.text}`;
                            if (current.parent.expression.text !== 'memo' && current.parent.expression.text !== 'forwardRef') {
                                isComponent = false;
                            }
                        } else if (ts.isPropertyAccessExpression(current.parent.expression)) {
                            funcName = `CallbackOf_${current.parent.expression.name.text}`;
                            if (current.parent.expression.name.text !== 'memo' && current.parent.expression.name.text !== 'forwardRef') {
                                isComponent = false;
                            }
                        }
                    }

                    if (/^[A-Z]/.test(funcName) && !funcName.startsWith('CallbackOf_') && funcName !== 'JsxAttributeCallback') {
                        isComponent = true;
                    } else if (funcName === 'CallbackOf_memo' || funcName === 'CallbackOf_forwardRef') {
                        isComponent = true;
                    } else if (/^use[A-Z]/.test(funcName)) {
                        isComponent = true;
                    } else if (funcName === '?') {
                         isComponent = true; 
                    }

                    if (isComponent) {
                        failReason = `VALIDATED BY: ${funcName}`;
                        break;
                    } else {
                        invalid = true;
                        failReason = `inside normal function or callback: ${funcName}`;
                        break;
                    }
                }
                current = current.parent;
            }
            if (invalid) {
                console.log(`INVALID HOOK: ${name} in ${file} at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${failReason}`);
            } else {
                console.log(`VALID: ${name} in ${file} at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1} (${failReason})`);
            }
        }
     }
     ts.forEachChild(node, visit);
  };
  visit(sourceFile);
});
