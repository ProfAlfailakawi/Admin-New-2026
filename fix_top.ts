import * as fs from 'fs';

function restoreFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /const topProducts = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.products, data\?\.invoices, data\?\.orders\]\);/g;
  
  const replacement = `const topProducts = useMemo(() => {
    return (data?.products || [])
      .map(p => ({
        ...p,
        sold: productPerformance[p.id]?.sold || 0
      }))
      .filter(p => p.sold > 0)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, productPerformance]);`;

  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Restored', filePath);
  } else {
    console.log('Regex not found in', filePath);
  }
}

restoreFile('src/components/PartnerDashboard.tsx');
restoreFile('src/components/Dashboard.tsx');
