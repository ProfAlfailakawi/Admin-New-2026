const fs = require('fs');
let code = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

code = code.replace(/<div onClick=\{\(e\) => e\.stopPropagation\(\)\} className=\{cn\("transition-all duration-300", activeSection === 'data' \?"block" :"hidden"\)\}>/g, '<div className={cn("transition-all duration-300", activeSection === \\'data\\' ?"block" :"hidden")}>');

fs.writeFileSync('src/components/GeneralSettings.tsx', code);
