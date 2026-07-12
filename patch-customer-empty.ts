import fs from 'fs';

let content = fs.readFileSync('src/components/CustomerPage.tsx', 'utf-8');

if (!content.includes('import SmartEmptyState')) {
    content = content.replace(
      "import InvoiceDetails from './InvoiceDetails';",
      "import InvoiceDetails from './InvoiceDetails';\nimport SmartEmptyState from './SmartEmptyState';"
    );
}

content = content.replace(
  '<div className="text-center py-20 text-slate-300 font-bold italic">لا توجد فواتير سابقة لهذا العميل.</div>',
  '<SmartEmptyState subtitle="لا توجد فواتير سابقة لهذا العميل." className="py-20" />'
);

fs.writeFileSync('src/components/CustomerPage.tsx', content);

