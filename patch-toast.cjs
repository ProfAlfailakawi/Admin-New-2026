const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const regex1 = /addToast\('فشل الاستيراد', 'هذا الملف ليس نسخة احتياطية صالحة للنظام. لم يتم تغيير أي بيانات.', 'error'\);/g;
const regex2 = /addToast\('فشل الاستيراد', 'ملف Excel غير متوافق. الرجاء رفع نسخة احتياطية صحيحة.', 'error'\);/g;

content = content.replace(regex1, "addToast('فشل الاستيراد', 'هذا الملف ليس نسخة احتياطية صالحة للنظام. لم يتم تغيير أي بيانات.', 'warning');");
content = content.replace(regex2, "addToast('فشل الاستيراد', 'ملف Excel غير متوافق. الرجاء رفع نسخة احتياطية صحيحة.', 'warning');");

fs.writeFileSync('src/components/GeneralSettings.tsx', content, 'utf8');
console.log("Replaced error toast with warning!");
