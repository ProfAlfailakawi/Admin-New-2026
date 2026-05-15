import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/App.tsx', 'utf8');

// The bottom floating button
// It has "className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] sm:hidden""
content = content.replace(
  'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] sm:hidden"',
  'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] md:hidden"'
);
content = content.replace(
  'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] md:hidden"', // in case I replaced it already
  'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] md:hidden"'
);

content = content.replace( // some versions might have it differently
  /<motion.div[^>]*className="[^"]*fixed bottom-8 left-1\/2 -translate-x-1\/2 z-\[100\][^"]*"[^>]*>/,
  (match) => {
    return match.replace('sm:hidden', 'md:hidden').replace('hidden md:hidden', 'md:hidden');
  }
);

writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx search buttons");
