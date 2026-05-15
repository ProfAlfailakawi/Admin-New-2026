import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/components/SmartOfferModal.tsx',
  'src/components/ProductPage.tsx',
  'src/components/SupplierAudit.tsx',
  'src/components/SupplierPage.tsx',
  'src/components/CustomerPage.tsx'
];

for (const file of files) {
  let content = readFileSync(file, 'utf8');

  content = content.replace(/w-\[min\(96vw\,720px\)\]/g, 'w-full max-w-[95%] md:max-w-2xl');
  content = content.replace(/w-\[95%\]/g, 'w-[95%] md:w-full'); // Already handles max-w-* bounds

  writeFileSync(file, content);
}

console.log("Updated Modal specific dimensions");
