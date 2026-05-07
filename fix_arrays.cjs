const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'src/components/OrderPage.tsx',
  'src/components/Dashboard.tsx',
  'src/components/SmartOffersCalculator.tsx',
  'src/components/WhatIfSimulator.tsx',
  'src/App.tsx',
  'src/lib/ai-engine.ts',
  'src/components/TrackPage.tsx'
];

filesToPatch.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/data\.products\.find/g, '(data?.products || []).find');
    content = content.replace(/data\.customers\.find/g, '(data?.customers || []).find');
    content = content.replace(/data\.suppliers\.find/g, '(data?.suppliers || []).find');
    content = content.replace(/data\.invoices\.find/g, '(data?.invoices || []).find');
    content = content.replace(/data\.zones\?\.find/g, '(data?.zones || []).find');
    fs.writeFileSync(file, content);
  }
});
