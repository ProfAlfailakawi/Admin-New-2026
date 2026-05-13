import fs from 'fs';

let content = fs.readFileSync('src/components/ReportsPage.tsx', 'utf-8');

if (!content.includes('import SmartEmptyState')) {
    content = content.replace(
      "import InvoiceDetails from './InvoiceDetails';",
      "import InvoiceDetails from './InvoiceDetails';\nimport SmartEmptyState from './SmartEmptyState';"
    );
}

const oldEmpty = `<div className="flex flex-col items-center justify-center p-8 md:p-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl opacity-70">
          <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-full shadow-sm flex items-center justify-center mb-4 md:mb-6">
            <FileText className="w-10 h-10 md:w-12 md:h-12 text-slate-300" />
          </div>
          <h3 className="text-xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">لا توجد فواتير!</h3>
          <p className="text-slate-500 font-bold max-w-sm mx-auto text-sm md:text-base">الهدوء يسبق العاصفة، ناطرين أول فاتورة تدخل وتزين هالمكان.</p>
        </div>`;

if(content.includes(oldEmpty)) {
    content = content.replace(oldEmpty, '<SmartEmptyState icon={<FileText className="w-10 h-10 text-slate-300" />} />');
} else {
    // try finding it using regex
    content = content.replace(
        /<div className="flex flex-col items-center justify-center p-8 md:p-16 text-center[\s\S]*?<p className="text-slate-500 font-bold[^>]*>.*?<\/p>\s*<\/div>/,
        '<SmartEmptyState icon={<FileText className="w-10 h-10 text-slate-300" />} />'
    );
}

fs.writeFileSync('src/components/ReportsPage.tsx', content);

