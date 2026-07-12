import * as fs from 'fs';
import * as path from 'path';

function fixTextSizeMobile(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixTextSizeMobile(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix raw 5xl, 6xl text sizes to be responsive
    content = content.replace(/className="([^"]*)text-5xl([^"]*)"/g, 'className="$1text-4xl sm:text-5xl$2"');
    content = content.replace(/className="([^"]*)text-6xl([^"]*)"/g, 'className="$1text-4xl sm:text-5xl md:text-6xl$2"');
    content = content.replace(/className="([^"]*)text-4xl([^"]*)"/g, (match, prefix, suffix) => {
        if (prefix.includes('sm:') || prefix.includes('md:') || prefix.includes('lg:')) return match;
        return `className="${prefix}text-3xl sm:text-4xl${suffix}"`;
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
    count += fixTextSizeMobile(dir);
  }
}
console.log(`Updated ${count} files with responsive text sizing.`);
