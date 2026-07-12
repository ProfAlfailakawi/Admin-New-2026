import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// replace the old showSplash part
content = content.replace(
/  const \[showSplash, setShowSplash\] = useState\(true\);\s*useEffect\(\(\) => \{\s*const timer = setTimeout\(\(\) => \{\s*setShowSplash\(false\);\s*\}, \d+\);\s*return \(\) => clearTimeout\(timer\);\s*\}, \[\]\);/,
''
);

// We still need to remove "if (showSplash) { ... }" if it's there.
// But earlier my regex or indexOf failed to remove it. Because the output of `grep -C 5 "showSplash"` didn't show `if (showSplash)`.
// Wait, I did `if (oldSplashStart !== -1 && oldSplashEnd !== -1)` in the previous patch, but the oldSplashEnd was "if (authLoading)". Maybe it wasn't found.
// Let's print out lines from 1200 to 1250.
fs.writeFileSync('src/App.tsx', content);
