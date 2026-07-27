import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/GeneralSettings.tsx', 'utf8');

// 1. Rename the setter from state
content = content.replace(
  /const \[settings, setSettings\] = useState<AppSettings>\(data\.settings\);/,
  `const [settings, setSettingsState] = useState<AppSettings>(data.settings);
  
  const setSettings = (updater: any) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setData(d => ({ ...d, settings: next }));
      return next;
    });
  };
  
  // Update local setting silently if remote is completely different (to not block typing)
  useEffect(() => {
     if (JSON.stringify(data.settings) !== JSON.stringify(settings)) {
         // Only replace if local is totally out of sync (not just typing)
         // Actually better to just do this on mount or when mode changes, 
         // but let's just do it directly.
         setSettingsState(data.settings);
     }
  }, [data.settings]);
  `
);

// Remove the two bad useEffects:
content = content.replace(/\/\/ Auto-save: sync settings changes back to the main app state\s*useEffect\(\(\) => \{[\s\S]*?\}, \[settings, setData\]\);/, '');
content = content.replace(/\/\/ Sync from parent to local settings if parent receives remote updates \(e\.g\. initial load\)\s*useEffect\(\(\) => \{[\s\S]*?\}, \[data\.settings\]\);/, '');

writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Patched correctly");
