import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/GeneralSettings.tsx', 'utf8');

// 1. Remove handleSave block
content = content.replace(/  const handleSave = \(\) => \{\n    setData\(prev => \(\{ \.\.\.prev, settings \}\)\);\n    setSaved\(true\);\n    addToast\("تم الحفظ بنجاح","تم حفظ إعدادات النظام وتحديثها في السحابة\.","success"\);\n    setTimeout\(\(\) => setSaved\(false\), 3000\);\n  \};\n\n/g, '');

// 2. Remove [saved, setSaved] and add useEffect
content = content.replace(/  const \[saved, setSaved\] = useState\(false\);\n/, "  // Auto-save\n  React.useEffect(() => {\n    setData(prev => ({ ...prev, settings }));\n  }, [settings, setData]);\n");

// 3. Remove save button from header
const btnRegex = /<button[\s\n]*onClick=\{handleSave\}[\s\S]*?<\/button>/;
content = content.replace(btnRegex, '');

// Also let's arrange "Enable Notifications" button inside a dropdown.
// Search for EnableNotificationsButton and move it somewhere inside a new accordion section.

writeFileSync('src/components/GeneralSettings.tsx', content);
console.log("Updated GeneralSettings.tsx");
