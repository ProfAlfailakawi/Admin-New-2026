import fs from 'fs';

let content = fs.readFileSync('src/components/OrderPage.tsx', 'utf-8');

if (!content.includes('import SmartEmptyState')) {
    content = content.replace(
      "import InvoiceDetails from './InvoiceDetails';",
      "import InvoiceDetails from './InvoiceDetails';\nimport SmartEmptyState from './SmartEmptyState';"
    );
}

const pattern = /<div className="flex flex-col items-center justify-center p-8 md:p-16 text-center[\s\S]*?<\/div>\s*<\/div>/g;
const replacement = '<SmartEmptyState subtitle="لا توجد طلبات معلقة والعمليات تعمل بهدوء تام. استمتع بلحظات النجاح الصافية." />';
// we can do a simpler replace by checking where "لا توجد طلبات معلقة والعمليات تعمل بهدوء تام" was.

content = content.replace(
  /<div className="flex flex-col items-center justify-center p-8 md:p-16 text-center bg-emerald-50 border-2 border-dashed border-emerald-200\/50 rounded-3xl opacity-90">[\s\S]*?<\/div>/,
  '<SmartEmptyState icon={<CheckCircle2 className="w-12 h-12 text-emerald-400" />} title="الوضع هادئ!" subtitle="لا توجد طلبات معلقة والعمليات تعمل بهدوء تام. الجو نظيف!" />'
);

content = content.replace(
  /<div className="flex flex-col items-center justify-center p-8 md:p-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl opacity-70">[\s\S]*?<\/div>/,
  '<SmartEmptyState icon={<ShoppingBag className="w-12 h-12 text-slate-300" />} subtitle="لا توجد طلبات حالياً." />'
);

fs.writeFileSync('src/components/OrderPage.tsx', content);

