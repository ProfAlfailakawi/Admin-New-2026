import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

function processDirectory(dir: string) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = readFileSync(fullPath, 'utf-8');
      let changed = false;

      // Make sure we don't accidentally replace already replaced ones:
      // "rounded-[32px] md:rounded-[40px]" -> if we just replace "rounded-[40px]" it might become "rounded-[32px] md:rounded-[32px] md:rounded-[40px]"
      // So let's skip files that already have "rounded-[32px] md:rounded-[40px]" or just be careful with regex.
      // Easiest is to replace "rounded-[40px]" with "rounded-[32px] md:rounded-[40px]"
      // but first replace "rounded-[32px] md:rounded-[40px]" back to "rounded-[40px]" just in case
      content = content.replace(/rounded-\[32px\] md:rounded-\[40px\]/g, 'rounded-[40px]');
      
      if (content.includes('rounded-[40px]')) {
        content = content.replace(/rounded-\[40px\]/g, 'rounded-[32px] md:rounded-[40px]');
        changed = true;
      }

      if (changed) {
        writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

processDirectory('./src');
