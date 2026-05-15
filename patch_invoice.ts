import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

const replacementFunc = `
function enforceEnglishNumbers(val: string) {
  if(!val) return val;
  return String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}
`;

if (!content.includes('enforceEnglishNumbers')) {
  // Let's add it right after imports
  content = content.replace(/import React/, replacementFunc + '\\nimport React');
}

// Replace the generic onChange for block, street, avenue, house, floor, apartment
const fields = ['block', 'street', 'avenue', 'house', 'floor', 'apartment'];

for (const field of fields) {
  const tpl = 'onChange={(e) => setAddress({ ...address, ' + field + ': e.target.value })}';
  const repl = 'onChange={(e) => setAddress({ ...address, ' + field + ': enforceEnglishNumbers(e.target.value) })}';
  content = content.replace(tpl, repl);
  
  const tpl2 = 'onChange={(e) => setAddress({...address, ' + field + ': e.target.value})}';
  content = content.replace(tpl2, repl);
}

// Add font-mono to inputs
content = content.split('\\n').map(line => {
  if (line.includes('placeholder="قطعة"') || line.includes('placeholder="شارع"') || line.includes('placeholder="جادة"') || line.includes('placeholder="منزل"') || line.includes('placeholder="دور"') || line.includes('placeholder="شقة"')) {
    if (line.includes('className="') && !line.includes('font-mono')) {
      return line.replace('className="', 'className="font-mono ');
    }
  }
  return line;
}).join('\\n');

writeFileSync('src/components/InvoicePage.tsx', content);
console.log("Updated invoice page for english numbers");
