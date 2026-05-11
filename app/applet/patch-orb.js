const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if(!content.includes('import SystemPulseOrb')) {
  // Let's insert it around Dashboard
  content = content.replace("import Dashboard from './components/Dashboard';", "import Dashboard from './components/Dashboard';\nimport SystemPulseOrb from './components/SystemPulseOrb';");
}

if(!content.includes('<SystemPulseOrb')) {
  content = content.replace('<AmbientBackground />', '<AmbientBackground />\n      {isAuthenticated && <SystemPulseOrb data={data} />}');
}

fs.writeFileSync('src/App.tsx', content);
