import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/lib/ai-engine.ts', 'utf8');

content = content.replace(/توصية النظام المتقدمة/g, 'مستشارك: التاجر العود');

// Change outputs to be 'Kuwaiti merchant' style in the recommendation generator
// Let's replace some string keys. 
content = content.replace(/'نفقاتكم بزيادة/g, "'دير بالك، الكيس فيه شق! نفقاتكم بزيادة");
content = content.replace(/'لاحظنا تركيز عدد الشكاوي هذا الأسبوع'/g, "'العملاء يشتكون يا الطيب، لازم تشوفلهم صرفة'");
content = content.replace(/'هامش الربح في تناقص مستمر'/g, "'أرباحك قاعدة تذوب مثل الثلج، لازم نشد الحزام'");
content = content.replace(/'مبيعاتكم تعتمد بشكل كلي على/g, "'لا تحط بيضك بسلة وحدة يا النشمي، مبيعاتك معتمدة على'");

content = content.replace(/توصية مبنية على البيانات/g, 'نصيحة من خبرة السوق');
content = content.replace(/توضيح:/g, 'خلاصة الشور:');

// Let's make sure we also change the specific requested strings just dynamically 
writeFileSync('src/lib/ai-engine.ts', content);
console.log("Updated AI Engine for Taajer Al-Oud persona");
