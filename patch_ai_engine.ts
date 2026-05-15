import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/lib/ai-engine.ts', 'utf8');

content = content.replace(/title: 'استرجاع كبار العملاء'/g, "title: 'استرجاع الغالين (كبار العملاء)'");
content = content.replace(/recommendation: `لديك \$\{vipChurn.length\} عملاء VIP لم يطلبوا منذ 30 يوماً. أطلق حملة خصم مخصصة لاستعادتهم فوراً.`/g, "recommendation: `يا النشمي.. عندك ${vipChurn.length} من كبار عملائك قاطعين من شهر، دزلهم عرض خاص وردهم لخيمتنا.`");

content = content.replace(/title: 'فرصة مضاعفة الأرباح'/g, "title: 'صيدة اليوم يا النشمي'");
content = content.replace(/recommendation: `المنتج "\$\{bestOne.name\}" بهامش ربح مرتفع جداً. التركيز عليه في الإعلانات سيزيد صافي ربحك بنسبة 20%.`/g, "recommendation: `الصنف \"${bestOne.name}\" فيه بركة وهامش ربحه يطيب الخاطر.. ركز عليه تسويقياً وبتدعيلي.`");

content = content.replace(/title: 'خطة تقليص النزيف المالي'/g, "title: 'دير بالك الكيس فيه شق!'");
content = content.replace(/recommendation: 'نفقاتك متقاربة جداً مع مبيعاتك. قم بمراجعة تكاليف الموردين للفئات الأقل بيعاً لرفع كفاءة النقد.'/g, "recommendation: 'نفقاتك هالشهر قاعدة تاكل أرباحك سكاتي، راجع دفاتر المشتريات وسد منافذ الهدر.'");

content = content.replace(/title: 'تعزيز ولاء العملاء'/g, "title: 'الحلال حلالك والعميل رأس مالك'");
content = content.replace(/recommendation: 'أداء نشاطك مستقر. استثمر في العروض المتكررة لضمان عودة عملائك وزيادة معدل الـ LTV.'/g, "recommendation: 'الأمور طيبة ولله الحمد، اهتم بزباينك الدائمين وضبطهم بعرض استثنائي وراح يرجعون لك دبل.'");

writeFileSync('src/lib/ai-engine.ts', content);
console.log("Updated AI recommendation texts");
