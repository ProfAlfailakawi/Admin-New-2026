import { readFileSync, writeFileSync } from 'fs';

const file = 'src/components/InvoicePage.tsx';
let content = readFileSync(file, 'utf8');

const fields = ['block', 'street', 'jaddah', 'building', 'floor', 'apartment'];

for (const field of fields) {
  const oldStr = `onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, ${field}: e.target.value}))}}`;
  const newStr = `onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, ${field}: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}`;
  content = content.replace(oldStr, newStr);
}

content = content.replace(/className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary\/20 focus:border-primary transition-all font-bold text-sm text-slate-800 text-right shadow-sm"/g, 'className="w-full font-mono bg-white border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"');

writeFileSync(file, content);
console.log("Done");
