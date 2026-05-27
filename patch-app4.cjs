const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /SHARDED_KEYS\.forEach\(key => \{\s*if \(Array\.isArray\(sanitizedRoot\[key\]\) && sanitizedRoot\[key\]\.length === 0\) \{\s*delete sanitizedRoot\[key\];\s*\}\s*\}\);/;

const replacement = `SHARDED_KEYS.forEach(key => {
               if (key !== 'products' && Array.isArray(sanitizedRoot[key]) && sanitizedRoot[key].length === 0) {
                 delete sanitizedRoot[key];
               }
             });`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', content, 'utf8');
    console.log("Successfully replaced step 4 in App.tsx");
} else {
    console.log("Target not found step 4 in App.tsx!");
}
