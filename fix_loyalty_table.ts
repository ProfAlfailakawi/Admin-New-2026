import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/LoyaltyProgramPage.tsx', 'utf8');

content = content.replace(/<table className="w-full text-right"/g, '<table className="w-full text-right min-w-[700px]"');

writeFileSync('src/components/LoyaltyProgramPage.tsx', content);
console.log("Updated LoyaltyProgramPage table min-width");
