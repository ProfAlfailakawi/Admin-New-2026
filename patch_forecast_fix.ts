import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/FutureForecast.tsx', 'utf8');

content = content.replace(/type="monotone" strokeWidth=\{3\} filter="url\(\#glow\)" \n dataKey="المبيعات" \n stroke="\#6366f1" \n strokeWidth=\{4\}\n fillOpacity=\{1\} \n fill="url\(\#colorSales\)" filter="url\(\#glow\)" /g, 
  'type="monotone"\n dataKey="المبيعات"\n stroke="#6366f1"\n strokeWidth={4}\n fillOpacity={1}\n fill="url(#colorSales)" filter="url(#glow)"');

content = content.replace(/type="monotone" strokeWidth=\{3\} filter="url\(\#glow\)" \n dataKey="الأرباح" \n stroke="\#10b981" \n strokeWidth=\{3\}\n fillOpacity=\{1\} \n fill="url\(\#colorProfit\)" filter="url\(\#glow\)" /g,
  'type="monotone"\n dataKey="الأرباح"\n stroke="#10b981"\n strokeWidth={3}\n fillOpacity={1}\n fill="url(#colorProfit)" filter="url(#glow)"');

// Wait, let's just use regex safely

content = content.replace(/strokeWidth=\{3\} filter="url\(\#glow\)"/g, '');
content = content.replace(/fill="url\(\#colorSales\)" filter="url\(\#glow\)"/g, 'fill="url(#colorSales)" filter="url(#glow)"');
content = content.replace(/fill="url\(\#colorProfit\)" filter="url\(\#glow\)"/g, 'fill="url(#colorProfit)" filter="url(#glow)"');

// ensure we only have one strokeWidth
content = content.replace(/strokeWidth=\{4\}\s*strokeWidth=\{4\}/g, 'strokeWidth={4}');

writeFileSync('src/components/FutureForecast.tsx', content);
console.log("Fixed multiple attributes");
