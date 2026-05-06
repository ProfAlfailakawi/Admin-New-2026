const fs = require('fs');
let file = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');

const s2Match = file.match(/\$\{invoice\.address \? `.*?غير محدد<\/span>'}/s);
if (s2Match) {
  const r2 = `\${(invoice.address && invoice.address !== 'غير محدد') ? \`<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: \${typeof invoice.address === 'object' ? [\`\${invoice.address.region||''}\`, \`ق\${invoice.address.block||''}\`, \`ش\${invoice.address.street||''}\`, \`م\${invoice.address.building||''}\`].filter(Boolean).join(' ') : invoice.address}</span>\` : invoice.deliveryInfo?.zoneName ? \`<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: \${invoice.deliveryInfo.zoneName}</span>\` : '<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: غير محدد</span>'}`;
  file = file.replace(s2Match[0], r2);
  console.log("Replaced printed address in Reports");
}

fs.writeFileSync('src/components/ReportsPage.tsx', file);
