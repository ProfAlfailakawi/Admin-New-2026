const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const rootDataOnly = \{ \.\.\.rawRootData \};\s*SHARDED_KEYS\.forEach\(k => \{\s*delete rootDataOnly\[k\];\s*\}\);/;

const replacement = `const rootDataOnly = { ...rawRootData };
          SHARDED_KEYS.forEach(k => {
             if (k !== 'products') {
                 delete rootDataOnly[k];
             }
          });`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', content, 'utf8');
    console.log("Successfully replaced step 3 in App.tsx");
} else {
    console.log("Target not found step 3 in App.tsx!");
}
