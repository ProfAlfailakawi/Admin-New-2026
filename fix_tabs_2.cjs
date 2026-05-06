const fs = require('fs');
const path = './src/components/Dashboard.tsx';
let txt = fs.readFileSync(path, 'utf8');

// For the title area
txt = txt.replace('className="space-y-3 relative z-10 w-full xl:w-auto"', 'className="space-y-3 relative z-10 w-full"');
// Make text larger or center? They say "تكون العنوان بصف كامل"
// Which could also mean the active tab label instead of the dashboard title
// If so, the changes to the tabs have already fixed "بصف كامل" for the tabs.

fs.writeFileSync(path, txt);
console.log("Done");
