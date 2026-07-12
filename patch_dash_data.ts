import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/const Dashboard: React.FC<DashboardProps> = React.memo\(\n  \(\{\n    data,\n/g, 'const Dashboard: React.FC<DashboardProps> = React.memo(\n  ({\n    data: rawData,\n');

// Wait, I need to insert the time machine state right after the states declarations
// Let's find `const [isPending, startTransition] = useTransition();`
let insertPos = content.indexOf('const [isPending, startTransition] = useTransition();');

if (insertPos > -1) {
  const insertCode = `
    const [timeMachineMode, setTimeMachineMode] = useState(0); // 0 = الحاضر, 1 = قبل شهر, 2 = قبل 3 شهور, 3 = قبل 6 شهور, 4 = قبل سنة
    
    const data = useMemo(() => {
      if (timeMachineMode === 0) return rawData;
      let daysBack = 0;
      if (timeMachineMode === 1) daysBack = 30;
      if (timeMachineMode === 2) daysBack = 90;
      if (timeMachineMode === 3) daysBack = 180;
      if (timeMachineMode === 4) daysBack = 365;
      
      const cutoff = Date.now() - (daysBack * 86400000);
      
      return {
        ...rawData,
        invoices: (rawData.invoices || []).filter((inv: any) => new Date(inv.time || inv.createdAt).getTime() <= cutoff),
        expenses: (rawData.expenses || []).filter((e: any) => new Date(e.date).getTime() <= cutoff)
      };
    }, [rawData, timeMachineMode]);
  `;
  content = content.slice(0, insertPos) + insertCode + '\n' + content.slice(insertPos);
}

// Now insert the sticky UI at the bottom of the Dashboard component
// search for `return (` and insert right after it into the outermost div
let returnPos = content.lastIndexOf('id="main-dashboard-wrap"'); // Actually let's search for the main wrapper.

// Let's use string operations safely.
writeFileSync('src/components/Dashboard.tsx', content);

console.log("Updated data injection");
