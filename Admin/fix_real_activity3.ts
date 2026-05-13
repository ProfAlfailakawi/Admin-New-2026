import * as fs from 'fs';

function applyFixDashboard(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (filePath.includes('PartnerDashboard')) {
     const partnerRegex = /const topProducts = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.products, data\?\.orders, salesMap, filter\]\);/g;
     
     const newTopProductsPartner = `const topProducts = useMemo(() => {
    const soldMap: Record<string, number> = {};
    
    for (const [pId, perf] of Object.entries(productPerformance as Record<string, {sold: number}>)) {
       soldMap[pId] = perf.sold || 0;
    }

    const now = new Date().getTime();
    const MS_PER_DAY = 86400000;
    const thresholds: Record<string, number> = {
      day: MS_PER_DAY,
      week: 7 * MS_PER_DAY,
      month: 30 * MS_PER_DAY,
      year: 365 * MS_PER_DAY,
    };
    const threshold = thresholds[filter];

    const completedOrders = (data?.orders || []).filter(o => {
      if (o.isConvertedToInvoice) return false;
      const st1 = String((o as any).paymentStatus || '').toLowerCase();
      const st2 = String(o.status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع وجاري التوصيل', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
      if (!isPaid) return false;
      
      if (threshold) {
         const getTimestamp = (obj: any) => {
           if (obj.createdAt && typeof obj.createdAt === 'object' && obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
           if (obj.date) return new Date(obj.date).getTime();
           if (obj.createdAt) return new Date(obj.createdAt).getTime();
           return 0;
         };
         const t = getTimestamp(o);
         if (t === 0 || (now - t > threshold)) return false;
      }
      return true;
    });

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + (Number(item.quantity) || 0);
      });
    });

    return (data?.products || [])
      .map(p => ({
        ...p,
        sold: soldMap[p.id] || 0
      }))
      .filter(p => p.sold > 0 && p.isActive !== false)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, data?.orders, productPerformance, filter]);`;
     
     content = content.replace(partnerRegex, newTopProductsPartner);
     console.log('Fixed PartnerDashboard');
  }

  fs.writeFileSync(filePath, content);
}

applyFixDashboard('src/components/PartnerDashboard.tsx');
