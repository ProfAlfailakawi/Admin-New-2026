import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('src/components/GeneralSettings.tsx', 'utf8');

// Replace all instances of `setSettings(p => ({ ...p, ` with direct calls that also update setData
let newContent = content.replace(/setSettings\s*\(\s*p\s*=>\s*\(\{\s*\.\.\.p,/g, `
    setSettings(p => {
        const next = { ...p, 
`);

newContent = newContent.replace(/const \[settings, setSettings\] = useState<AppSettings>\(data\.settings\);/, `
    const [settings, setSettings] = useState<AppSettings>(data.settings);

    // Custom setSettings wrapper to guarantee global sync immediately
    const updateSettingsField = (updater: (prev: AppSettings) => AppSettings) => {
        setSettings(prev => {
            const next = updater(prev);
            setData(d => ({ ...d, settings: next }));
            return next;
        });
    };
`);

newContent = newContent.replace(/setSettings\s*\(/g, 'updateSettingsField(');
newContent = newContent.replace(/const updateSettingsField =/g, 'setSettings ='); // restore the one we injected
newContent = newContent.replace(/setSettings\s*=\s*\(/g, 'const updateSettingsField = (');

// Remove the two useEffects that cause looping
newContent = newContent.replace(/\/\/ Auto-save: sync settings changes back to the main app state\s*useEffect\(\(\) => \{[\s\S]*?\}, \[settings, setData\]\);/m, '');
newContent = newContent.replace(/\/\/ Sync from parent to local settings if parent receives remote updates \(e\.g\. initial load\)\s*useEffect\(\(\) => \{[\s\S]*?\}, \[data\.settings\]\);/m, '');

// For setting directly, we need to rewrite `updateSettingsField` logic
newContent = newContent.replace(/const \[settings, updateSettingsField\] = useState/, 'const [settings, setSettingsState] = useState');

newContent = newContent.replace(/const updateSettingsField = \(updater: \(prev: AppSettings\) => AppSettings\) => \{([\s\S]*?)\};/, `
    const updateSettingsField = (updater: any) => {
        setSettingsState(prev => {
            let next;
            if (typeof updater === 'function') {
                next = updater(prev);
            } else {
                next = updater;
            }
            setData(d => ({ ...d, settings: next }));
            return next;
        });
    };
`);

writeFileSync('src/components/GeneralSettings.tsx', newContent);
console.log("Patched!");
