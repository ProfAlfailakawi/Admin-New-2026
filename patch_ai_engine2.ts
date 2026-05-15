import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/lib/ai-engine.ts', 'utf8');

content = content.replace(/title: 'تعزيز ولاء العملاء',/g, "title: 'الحلال حلالك والعميل رأس مالك',");
content = content.replace(/recommendation: 'وضعك المالي مستقر. ينصح بإطلاق نظام نقاط للمكافآت لزيادة معدل تكرار الشراء لدى عملائك الحاليين.',/g, "recommendation: 'الأمور طيبة ولله الحمد، اهتم بزباينك الدائمين وضبطهم بعرض استثنائي وراح يرجعون لك دبل.',");

writeFileSync('src/lib/ai-engine.ts', content);
console.log("Updated AI recommendation texts part 2");
