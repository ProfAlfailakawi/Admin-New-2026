import * as fs from 'fs';

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/!p\.isDeleted && /g, '');
  content = content.replace(/ && p\.isActive !== false/g, '');
  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
}

fixFile('src/components/PartnerDashboard.tsx');
fixFile('src/components/Dashboard.tsx');
