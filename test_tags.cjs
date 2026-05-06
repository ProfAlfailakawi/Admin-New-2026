const fs = require('fs');
let code = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const startIdx = code.indexOf('<button \n onClick={() => setActiveSection(activeSection === \\'data\\' ? \\'\\' : \\'data\\')}');
const endIdx = code.indexOf('<div onClick={(e) => e.stopPropagation()} className={cn("transition-all duration-300", activeSection === \\'data\\' ?"block" :"hidden")}>');

console.log(code.substring(code.indexOf('setActiveSection(activeSection === \\'data\\''), endIdx));
