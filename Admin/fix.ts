import * as fs from 'fs';

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /const topProducts = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.products, productPerformance\]\);/g;
  
  const replacement = `const topProducts = useMemo(() => {
    const allTimeMap: Record<string, number> = {};
    const paidInvoices = (data?.invoices || []).filter(inv => !inv.isDeleted && (inv.paymentStatus === 'paid' || inv.paymentStatus === undefined));
    const completedOrders = (data?.orders || []).filter(o => !o.isConvertedToInvoice && ['delivered', 'تم التوصيل', 'completed'].includes((o.status || '').toLowerCase()));
    
    paidInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        allTimeMap[item.productId] = (allTimeMap[item.productId] || 0) + (item.quantity || 0);
      });
    });
    
    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        allTimeMap[item.productId] = (allTimeMap[item.productId] || 0) + (item.quantity || 0);
      });
    });

    return (data?.products || [])
      .map(p => ({
        ...p,
        sold: allTimeMap[p.id] || 0
      }))
      .filter(p => p.sold > 0 && !p.isDeleted && p.isActive !== false)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, data?.invoices, data?.orders]);`;

  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
}

fixFile('src/components/PartnerDashboard.tsx');
fixFile('src/components/Dashboard.tsx');
