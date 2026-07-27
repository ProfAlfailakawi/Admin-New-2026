import * as fs from 'fs';
import * as path from 'path';

function fixFlexOverflow(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixFlexOverflow(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // ensure that all overflow-x-auto wrappers are safe in flex containers
    content = content.replace(/className="overflow-x-auto/g, 'className="overflow-x-auto w-full max-w-full');
    content = content.replace(/className="flex-1 overflow-y-auto/g, 'className="flex-1 min-w-0 overflow-y-auto');
    content = content.replace(/className="flex-1 min-w-0 min-w-0/g, 'className="flex-1 min-w-0');
    
    // adjust table wrapper radius for mobile to not clip awkwardly
    content = content.replace(/rounded-[2|3]xl border/g, (match) => {
      if(match.includes('3xl')) return 'rounded-2xl md:rounded-3xl border';
      return 'rounded-xl md:rounded-2xl border';
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      processed++;
    }
  }
  return processed;
}

const appDirs = [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'admin/src')];
let count = 0;
for (const dir of appDirs) {
  if (fs.existsSync(dir)) {
    count += fixFlexOverflow(dir);
  }
}
console.log(`Updated ${count} files with flex overflow fixes.`);
