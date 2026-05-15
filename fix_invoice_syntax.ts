import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

// The file might contain literal backslash + n
content = content.replace(/\\\\nimport React/g, '\\nimport React');
content = content.replace(/\\\\r\\\\nimport React/g, '\\nimport React');
content = content.replace(/\\\\n/g, '\\n'); // Any other accidental
// Wait, I messed it up in the previous step by doing `.join('\\n')` which puts literal `\n` in the file.
// Let's replace literal `\` followed by `n` everywhere in the file! Wait no, that could break regular regexes like \n .

// Let's just fix what I broke 
content = content.replace(/\\nimport React/g, '\\nimport React');
// The literal strings I injected were "\n" the actual 2 characters.
while(content.includes('\\\\n')) {
  content = content.replace(/\\\\n/g, '\\n');
}
while(content.includes('\\\\r')) {
  content = content.replace(/\\\\r/g, '\\r');
}

writeFileSync('src/components/InvoicePage.tsx', content);
