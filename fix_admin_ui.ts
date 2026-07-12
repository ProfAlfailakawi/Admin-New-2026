import * as fs from 'fs';
import * as path from 'path';

function processDir(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += processDir(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remove redundant padding classes
    content = content.replace(/p-3 md:p-3/g, 'p-4 md:p-5 lg:p-6');
    content = content.replace(/md:p-3/g, 'md:p-5');

    // Fix ultra large rounded corners that might break design
    content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl lg:rounded-[2rem]');
    content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl lg:rounded-[2rem]');

    // Micro interactions: update scale to be less aggressive and add duration
    content = content.replace(/active:scale-95/g, 'active:scale-[0.98] transition-all duration-200');

    // Fix text-10px
    content = content.replace(/text-\[10px\]/g, 'text-[11px] sm:text-xs');
    
    // Convert extreme horizontal scroll hiding
    content = content.replace(/hide-scrollbar/g, 'custom-scrollbar');
    
    // Fix gap issues on desktop vs mobile
    content = content.replace(/gap-2 md:gap-2/g, 'gap-3 md:gap-4');
    content = content.replace(/gap-3 md:gap-3/g, 'gap-3 md:gap-4');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      processed++;
    }
  }
  return processed;
}

const adminDir = path.join(process.cwd(), 'admin/src');
if (fs.existsSync(adminDir)) {
  const count = processDir(adminDir);
  console.log(`Updated ${count} files in admin.`);
}
