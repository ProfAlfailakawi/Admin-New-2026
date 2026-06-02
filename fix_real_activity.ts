import * as fs from 'fs';

function applyFixDashboard(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 1: recentOrders
  const recentOrdersRegex = /const recentOrders = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.orders\]\);/g;
  const newRecentOrders = `const recentOrders = useMemo(() => {
      const allOrders = (data?.orders || []).map(o => ({ ...o, _type: 'order' as const }));
      const linkedInvoiceIds = new Set(allOrders.map(o => o.linkedInvoiceId).filter(Boolean));
      
      const allInvoices = (data?.invoices || [])
        .filter(i => !i.isDeleted && !linkedInvoiceIds.has(i.id))
        .map(i => ({ ...i, _type: 'invoice' as const }));
      
      const combined = [...allOrders, ...allInvoices];
      
      const getTimestamp = (obj: any) => {
        if (obj.createdAt && typeof obj.createdAt === 'object' && obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
        if (obj.updatedAt && typeof obj.updatedAt === 'object' && obj.updatedAt.seconds) return obj.updatedAt.seconds * 1000;
        if (obj.timestamp && typeof obj.timestamp === 'object' && obj.timestamp.seconds) return obj.timestamp.seconds * 1000;
        if (obj.createdAt) {
          const t = new Date(obj.createdAt).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.updatedAt) {
          const t = new Date(obj.updatedAt).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.invoiceDate) {
          const t = new Date(obj.invoiceDate).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.orderDate) {
          const t = new Date(obj.orderDate).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.date) {
          const t = new Date(obj.date).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };

      return combined
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, 10);
    }, [data?.orders, data?.invoices]);`;

  if (recentOrdersRegex.test(content)) {
    content = content.replace(recentOrdersRegex, newRecentOrders);
    console.log('Fixed recentOrders in', filePath);
  } else {
    console.log('recentOrders Regex NOT FOUND in', filePath);
  }

  // Fix 2: topProducts
  const topProductsRegex = /const topProducts = useMemo\(\(\) => \{[\s\S]*?\}, \[data\?\.products, data\?\.invoices, data\?\.orders\]\);/g;
  
  const newTopProductsDashboard = `const topProducts = useMemo(() => {
    const soldMap: Record<string, number> = {};
    
    for (const [pId, perf] of Object.entries(productPerformance)) {
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
    const threshold = thresholds[dateFilter];

    const completedOrders = (data?.orders || []).filter(o => {
      if (o.isConvertedToInvoice) return false;
      const st1 = String((o as any).paymentStatus || '').toLowerCase();
      const st2 = String(o.status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع بنجاح', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
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
  }, [data?.products, data?.orders, productPerformance, dateFilter]);`;

  if (topProductsRegex.test(content)) {
    content = content.replace(topProductsRegex, newTopProductsDashboard);
    console.log('Fixed topProducts in Dashboard');
  }

  // Also in PartnerDashboard
  const newTopProductsPartner = `const topProducts = useMemo(() => {
    const soldMap: Record<string, number> = {};
    
    for (const [pId, perf] of Object.entries(salesMap)) {
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
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع بنجاح', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
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
  }, [data?.products, data?.orders, salesMap, filter]);`;

  if (filePath.includes('PartnerDashboard')) {
     if (topProductsRegex.test(content)) {
       content = content.replace(topProductsRegex, newTopProductsPartner);
       console.log('Fixed topProducts in PartnerDashboard');
     }
  }

  // Also replace `recentOrders` but with `data?.orders` ? Wait, PartnerDashboard doesn't have `recentOrders`.
  
  fs.writeFileSync(filePath, content);
}

applyFixDashboard('src/components/Dashboard.tsx');
applyFixDashboard('src/components/PartnerDashboard.tsx');
