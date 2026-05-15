import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/GeneralSettings.tsx', 'utf8');

content = content.replace('الإصدار 2.1 برو - تم تطويره بكل فخر لدعم نمو عملك.', 'الإصدار 2.5 برو - تم تطويره بكل فخر لدعم نمو عملك.');

writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Updated version to 2.5");
