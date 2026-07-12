import * as fs from 'fs';
import * as path from 'path';

function fixTouchTargets(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixTouchTargets(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We'll target `<button` elements that contain `p-1`, `p-2`, `w-8 h-8`, etc., 
    // and make sure they have a minimum touch target by adding md-specific padding or min-h/min-w.
    // Instead of regex manipulation which is risky on JSX, we'll just add minimal touch sizing to specific known small paddings on buttons.
    content = content.replace(/className="([^"]*\bp-[12](\.5)?\b[^"]*)"/g, (match, classNames) => {
      // If it already has min-h or min-w or is large padding, skip
      if (classNames.includes('min-h-') || classNames.includes('min-w-') || classNames.includes('px-') || classNames.includes('py-')) return match;
      if (classNames.includes('w-') && classNames.includes('h-')) {
          // If it has explicitly set dimensions larger than 11 (44px), skip
          if (classNames.match(/w-(12|14|16|20|24|32|full)/)) return match;
      }
      return `className="${classNames} min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"`;
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
    count += fixTouchTargets(dir);
  }
}
console.log(`Updated ${count} files with better touch targets.`);
