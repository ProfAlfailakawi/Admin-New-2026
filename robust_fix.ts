import * as fs from 'fs';

function applyFix(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  const regex = /const topProducts = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.products, productPerformance\]\);/g;

  const replacement = `const topProducts = useMemo(() => {
    const allTimeMap: Record<string, number> = {};
    
    const paidInvoices = (data?.invoices || []).filter(inv => {
      if (inv.isDeleted) return false;
      // Use status-utils compatible checks or fallback for demo data
      const st1 = String(inv.paymentStatus || '').toLowerCase();
      const st2 = String((inv as any).status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع بنجاح', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
      
      if (isPaid) return true;
      if (!inv.paymentStatus && !(inv as any).status) return true; // demo data
      return false;
    });

    const completedOrders = (data?.orders || []).filter(o => {
      if (o.isConvertedToInvoice) return false;
      const st1 = String((o as any).paymentStatus || '').toLowerCase();
      const st2 = String(o.status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع بنجاح', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
      return isPaid;
    });
    
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
      .filter(p => p.sold > 0 && p.isActive !== false)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, data?.invoices, data?.orders]);`;

  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Applied robust all-time topProducts to', filePath);
  } else {
    console.log('Regex NOT FOUND in', filePath);
  }
}

applyFix('src/components/PartnerDashboard.tsx');
applyFix('src/components/Dashboard.tsx');
