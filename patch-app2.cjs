const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const rootDocData = \{ \.\.\.splitData \};\s*SHARDED_KEYS\.forEach\(key => \{\s*delete rootDocData\[key\];\s*\}\);/;

const replacement = `const rootDocData = { ...splitData };
          SHARDED_KEYS.forEach(key => {
             if (key !== 'products') {
                 delete rootDocData[key];
             }
          });`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', content, 'utf8');
    console.log("Successfully replaced step 2 in App.tsx");
} else {
    console.log("Target not found step 2 in App.tsx!");
}
