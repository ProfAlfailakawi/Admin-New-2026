import fs from 'fs';

let content = fs.readFileSync('src/components/ClientSniperRadar.tsx', 'utf-8');

content = content.replace(
  "target.riskLevel === 'preemptive' ? 'bg-indigo-500/20' : selectedTarget.riskLevel === 'critical' ? 'bg-rose-500/20' : 'bg-amber-500/20'",
  "selectedTarget.riskLevel === 'preemptive' ? 'bg-indigo-500/20' : selectedTarget.riskLevel === 'critical' ? 'bg-rose-500/20' : 'bg-amber-500/20'"
);

fs.writeFileSync('src/components/ClientSniperRadar.tsx', content);

console.log("TS error patched.");
