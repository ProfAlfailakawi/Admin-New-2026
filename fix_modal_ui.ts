import * as fs from 'fs';
import * as path from 'path';

function fixModals(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixModals(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix awkward hardcoded max-widths for modals
    content = content.replace(/w-\[min\([^)]+\)\]/g, 'w-[95%] max-w-2xl');
    content = content.replace(/w-\[95%\]/g, 'w-full max-w-[95%] sm:max-w-[lg,xl,2xl]'); // will fix below
    content = content.replace(/w-full max-w-\[95%\] sm:max-w-\[lg,xl,2xl\]/g, 'w-[95%]'); // revert above generic
    
    content = content.replace(/w-\[95%\] max-w-lg/g, 'w-full max-w-[95%] sm:max-w-lg');
    content = content.replace(/w-\[95%\] max-w-xl/g, 'w-full max-w-[95%] sm:max-w-xl');
    content = content.replace(/w-\[95%\] max-w-2xl/g, 'w-full max-w-[95%] sm:max-w-2xl');

    // Fix overall font readability, some text is text-sm on desktop where it could be better,
    // but mostly adjusting leading is safer.
    content = content.replace(/leading-tight/g, 'leading-snug');
    
    // Smooth shadows
    content = content.replace(/shadow-2xl/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.08)]');
    content = content.replace(/border-slate-100/g, 'border-slate-200/60');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      processed++;
    }
  }
  return processed;
}

const appDirs = [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'admin/src')];
for (const dir of appDirs) {
  if (fs.existsSync(dir)) {
    const count = fixModals(dir);
    console.log(`Updated ${count} files in ${dir}.`);
  }
}
