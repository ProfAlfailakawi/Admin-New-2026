import fs from 'fs';

let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf-8');

content = content.replace(
  /setData\(demo\);\s*addToast\("تم تحميل البيانات","تم ملء النظام ببيانات تجريبية شاملة للمعاينة\.","info"\);/,
  "setData(demo);\n  localStorage.setItem('hideSampleDataPrompt', 'true');\n  addToast(\"تم تحميل البيانات\",\"تم ملء النظام ببيانات تجريبية شاملة للمعاينة.\",\"info\");"
);

fs.writeFileSync('src/components/GeneralSettings.tsx', content);

console.log("Patch 8 fixed.");
