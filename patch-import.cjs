const fs = require('fs');

let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const jsonRegex = /if \(isJson\) \{\s*const importedData = JSON\.parse\(result as string\);\s*if \(importedData && typeof importedData === 'object'\) \{/;
const jsonReplacement = `if (isJson) {
  const importedData = JSON.parse(result as string);
  
  if (importedData && typeof importedData === 'object') {
     // VALIDATE JSON is actually an app backup
     const hasValidKeys = Array.isArray(importedData.products) || Array.isArray(importedData.invoices) || Array.isArray(importedData.orders) || Array.isArray(importedData.customers);
     if (!hasValidKeys) {
         addToast('فشل الاستيراد', 'هذا الملف ليس نسخة احتياطية صالحة للنظام. لم يتم تغيير أي بيانات.', 'error');
         return;
     }`;

const excelRegex = /const dataArray = new Uint8Array\(result as ArrayBuffer\);\s*const workbook = XLSX\.read\(dataArray, \{ type: 'array' \}\);\s*const safeSheetToObj = \(sheetName: string\) => \{/;
const excelReplacement = `const dataArray = new Uint8Array(result as ArrayBuffer);
  const workbook = XLSX.read(dataArray, { type: 'array' });
  
  // VALIDATE XLSX is actually a KT backup (must contain at least one known sheet)
  const knownSheets = ["FullState", "Invoices", "Products", "Orders", "Customers", "Summary", "Expenses"];
  const hasKnownSheet = workbook.SheetNames.some(s => knownSheets.includes(s));
  if (!hasKnownSheet) {
      addToast('فشل الاستيراد', 'ملف Excel غير متوافق. الرجاء رفع نسخة احتياطية صحيحة.', 'error');
      return;
  }
  
  const safeSheetToObj = (sheetName: string) => {`;

if (jsonRegex.test(content) && excelRegex.test(content)) {
    content = content.replace(jsonRegex, jsonReplacement).replace(excelRegex, excelReplacement);
    fs.writeFileSync('src/components/GeneralSettings.tsx', content, 'utf8');
    console.log("Patched import logic successfully!");
} else {
    console.log("Failed to patch import logic.");
}
