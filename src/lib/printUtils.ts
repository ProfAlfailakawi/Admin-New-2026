import { AppState, Invoice } from '../types';
import { DEFAULT_GLOBAL_LOGO } from '../constants';

export function generateInvoiceHTML(invoice: Invoice, data: AppState): string {
    const customer = (data?.customers || []).find(c => c.id === invoice.customerId);
    const invoiceSubtotal = (invoice?.items || []).reduce((acc, item) => {
    let baseSum = item.priceAtTime * item.quantity;
    if (item.addons && item.addons.length > 0) {
        item.addons.forEach((addon) => {
            if ((addon as any).isHiddenPrice) {
                let addonQty = 0;
                if ((addon as any).calculationType === 'fixed') addonQty = 1;
                else if ((addon as any).calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / ((addon as any).xItemsThreshold || 1));
                else addonQty = item.quantity;        addonQty = Math.max(((addon as any).minQuantity || 0), Math.min(addonQty, ((addon as any).maxQuantity || addonQty)));

                baseSum += Number((addon as any).price || 0) * Math.max(0, addonQty - ((addon as any).freeQuantity || 0));
            }
        });
    }
    return acc + baseSum;
}, 0);

const invoiceAddonsTotal = (invoice?.items || []).reduce((acc, item) => {
    let addonSum = 0;
    if (item.addons && item.addons.length > 0) {
        item.addons.forEach((addon) => {
            if (!(addon as any).isHiddenPrice) {
                let addonQty = 0;
                if ((addon as any).calculationType === 'fixed') addonQty = 1;
                else if ((addon as any).calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / ((addon as any).xItemsThreshold || 1));
                else addonQty = item.quantity;        addonQty = Math.max(((addon as any).minQuantity || 0), Math.min(addonQty, ((addon as any).maxQuantity || addonQty)));

                addonSum += Number((addon as any).price || 0) * Math.max(0, addonQty - ((addon as any).freeQuantity || 0));
            }
        });
    }
    return acc + addonSum;
}, 0);
    const invoiceDiscount = invoice.discount || 0;
    
    const itemsHtml = (invoice?.items || []).map(item => {
        const product = (data?.products || []).find(p => p.id === item.productId);
        let displayPrice = Number(item.priceAtTime || 0);
        let printRowTotal = Number(item.priceAtTime || 0) * (item.quantity || 1);
        let addonsHtml = '';
        
        if (item.addons && item.addons.length > 0) {
            item.addons.forEach((addon) => {
                let addonQty = 0;
                if ((addon as any).calculationType === 'fixed') addonQty = 1;
                else if ((addon as any).calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / ((addon as any).xItemsThreshold || 1));
                else addonQty = item.quantity;        addonQty = Math.max(((addon as any).minQuantity || 0), Math.min(addonQty, ((addon as any).maxQuantity || addonQty)));

                
                if (addonQty > 0) {
                    printRowTotal += Number((addon as any).price || 0) * Math.max(0, addonQty - ((addon as any).freeQuantity || 0));
                    if ((addon as any).isHiddenPrice) {
                        displayPrice += (Number((addon as any).price) * addonQty) / (item.quantity || 1);
                        addonsHtml += '<div class="item-cat" style="color:#4b5563; margin-top:2px; font-size:12px;">+ ' + (addon as any).name + (addonQty > 1 ? ' (' + addonQty + ')' : '') + '</div>';
                    } else {
                        addonsHtml += '<div class="item-cat" style="color:#4b5563; margin-top:2px; font-size:12px;">+ ' + (addon as any).name + (addonQty > 1 ? ' (' + addonQty + ')' : '') + ' - (' + (Number((addon as any).price) * addonQty).toFixed(3) + ' د.ك)</div>';
                    }
                }
            });
        }
        
        return `
            <tr class="item-row">
                <td>
                    <div class="item-details">
                        <div class="item-name">${product?.name || 'منتج غير معروف'}</div>
                        ${addonsHtml}
                        ${item.itemNotes ? `<div class="item-cat" style="color:#d97706">${item.itemNotes}</div>` : ''}
                    </div>
                </td>
                <td class="text-center">
                    <span class="qty-badge val-num">${item.quantity || 0}</span>
                </td>
                <td class="text-left val-num">${Number(displayPrice).toFixed(3)}</td>
                <td class="text-left val-num">${Number(printRowTotal).toFixed(3)}</td>
            </tr>
        `;
    }).join('');

    return `
      <html dir="rtl">
        <head>
          <title>فاتورة ${invoice.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
          <style>
              :root {
                  --primary: #0f172a;
                  --secondary: #8b5cf6;
                  --accent: #f59e0b;
                  --text-main: #1e293b;
                  --text-muted: #64748b;
                  --bg: #ffffff;
                  --bg-alt: #f8fafc;
                  --border: #e2e8f0;
                  --emerald: #10b981;
              }
              body { 
                  font-family: 'Cairo', sans-serif; 
                  margin: 0; 
                  padding: 40px; 
                  background: #e2e8f0;
                  color: var(--text-main);
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  display: flex;
                  justify-content: center;
              }
              .invoice-box {
                  background: var(--bg);
                  width: 100%;
                  max-width: 800px;
                  padding: 50px 60px;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
                  border-radius: 20px;
                  position: relative;
                  overflow: hidden;
              }
              .invoice-box::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 8px;
                  background: linear-gradient(90deg, var(--secondary), var(--accent));
              }
              .watermark {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-15deg);
                  width: 500px;
                  opacity: 0.025;
                  pointer-events: none;
                  z-index: 0;
                  filter: grayscale(100%);
              }
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  border-bottom: 2px solid var(--bg-alt);
                  padding-bottom: 30px;
                  margin-bottom: 40px;
              }
              .brand .logo {
                  font-size: 32px;
                  font-weight: 900;
                  color: var(--primary);
                  letter-spacing: -1px;
                  margin: 0 0 4px 0;
                  display: flex;
                  align-items: center;
                  gap: 12px;
              }
              .brand .logo svg {
                  width: 32px;
                  height: 32px;
                  color: var(--secondary);
              }
              .brand .slogan {
                  font-size: 13px;
                  font-weight: 700;
                  color: var(--text-muted);
                  letter-spacing: 0.5px;
              }
              .invoice-meta {
                  text-align: left;
              }
              .invoice-meta .title {
                  font-size: 36px;
                  font-weight: 900;
                  color: var(--primary);
                  margin: 0 0 5px 0;
                  text-transform: uppercase;
              }
              .invoice-meta .inv-number {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 16px;
                  font-weight: 700;
                  background: var(--secondary);
                  color: white;
                  padding: 4px 12px;
                  border-radius: 8px;
                  display: inline-block;
              }
              .customer-date-section {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 40px;
                  background: var(--bg-alt);
                  padding: 25px;
                  border-radius: 16px;
                  border: 1px solid var(--border);
              }
              .info-col {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
              }
              .info-label {
                  font-size: 12px;
                  text-transform: uppercase;
                  font-weight: 800;
                  letter-spacing: 1px;
                  color: var(--text-muted);
              }
              .info-val {
                  font-size: 18px;
                  font-weight: 800;
                  color: var(--primary);
              }
              .info-sub {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 14px;
                  color: var(--text-muted);
                  font-weight: 600;
              }
              table {
                  width: 100%;
                  border-collapse: separate;
                  border-spacing: 0;
                  margin-bottom: 40px;
              }
              th {
                  background: var(--primary);
                  color: white;
                  padding: 16px;
                  font-size: 13px;
                  font-weight: 700;
                  text-align: right;
              }
              th:first-child { border-radius: 0 12px 12px 0; }
              th:last-child { border-radius: 12px 0 0 12px; text-align: left; }
              td {
                  padding: 20px 16px;
                  border-bottom: 1px solid var(--border);
                  vertical-align: middle;
              }
              .item-row:last-child td { border-bottom: none; }
              .item-details .item-name {
                  font-size: 16px;
                  font-weight: 800;
                  color: var(--text-main);
                  margin-bottom: 4px;
              }
              .item-details .item-cat {
                  font-size: 12px;
                  color: var(--text-muted);
                  font-weight: 600;
              }
              .val-num {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 15px;
                  font-weight: 700;
              }
              td.text-center { text-align: center; }
              td.text-left { text-align: left; }
              .qty-badge {
                  background: var(--bg-alt);
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-weight: 800;
                  border: 1px solid var(--border);
                  color: var(--primary);
              }
              .summary-section {
                  display: flex;
                  justify-content: flex-end;
                  margin-top: 20px;
              }
              .summary-box {
                  width: 350px;
                  background: var(--bg-alt);
                  border: 1px solid var(--border);
                  border-radius: 16px;
                  padding: 24px;
              }
              .summary-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding-bottom: 16px;
                  margin-bottom: 16px;
                  border-bottom: 1px dashed var(--border);
              }
              .summary-row:last-child {
                  border-bottom: none;
                  margin-bottom: 0;
                  padding-bottom: 0;
              }
              .sum-label {
                  font-size: 14px;
                  font-weight: 700;
                  color: var(--text-muted);
              }
              .sum-val {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 16px;
                  font-weight: 700;
                  color: var(--text-main);
              }
              .total-row {
                  background: var(--primary);
                  padding: 20px;
                  border-radius: 12px;
                  color: white;
                  margin-top: 8px;
                  border-bottom: none;
              }
              .total-row .sum-label {
                  color: rgba(255,255,255,0.8);
                  font-size: 16px;
              }
              .total-row .sum-val {
                  color: white;
                  font-size: 26px;
                  font-weight: 900;
              }
              .currency {
                  font-family: 'Cairo', sans-serif;
                  font-size: 12px;
                  margin-right: 6px;
                  opacity: 0.8;
                  font-weight: 700;
              }
              footer {
                  margin-top: 60px;
                  text-align: center;
                  border-top: 2px solid var(--bg-alt);
                  padding-top: 30px;
              }
              .footer-text {
                  font-size: 14px;
                  font-weight: 700;
                  color: var(--text-muted);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
              }
              .footer-contact {
                  margin-top: 8px;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 12px;
                  color: var(--text-muted);
              }
              @media print {
                  body { background: white; padding: 0; }
                  .invoice-box { box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; border: none; }
                  .invoice-box::before { display: none; }
              }
          </style>
        </head>
        <body>
          <div class="invoice-box">
              <img src="${data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" class="watermark" style="mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.2);" referrerPolicy="no-referrer" />
              <div class="header">
                  <div class="brand">
                      <h1 class="logo">
                          <div class="logo-wrapper" style="background: transparent; padding: 6px; border-radius: 14px; margin-left: 14px; display: flex; align-items: center; justify-content: center;">
                            <img src="${data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" alt="Logo" style="width: 38px; height: 38px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.2);" referrerPolicy="no-referrer" />
                          </div>
                          ${data.settings?.companyName || 'شركة مطبخ التراث الكويتي'}
                      </h1>
                  </div>
                  <div class="invoice-meta">
                      <h2 class="title">فاتورة</h2>
                      <div class="inv-number">INV-${invoice.id.slice(0,8).toUpperCase()}</div>
                  </div>
              </div>

              <div class="customer-date-section">
                  <div class="info-col">
                      <span class="info-label">معلومات العميل</span>
                      <span class="info-val">الاسم: ${customer?.name || (invoice as any).customerName || 'عميل نقدي (Walk-in)'}</span>
                      <span class="info-val">رقم الهاتف: ${customer?.phone || (invoice as any).customerPhone || '---'}</span>
                      ${invoice.address ? `<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: ${typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address}</span>` : '<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: غير محدد</span>'}
                  </div>
                  <div class="info-col" style="text-align: left;">
                      <span class="info-label">تاريخ الإصدار</span>
                      <span class="info-val">${new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
              </div>

              <table>
                  <thead>
                      <tr>
                          <th>البيان / المنتج</th>
                          <th style="text-align: center;">الكمية</th>
                          <th style="text-align: left;">سعر الوحدة (د.ك)</th>
                          <th style="text-align: left;">الإجمالي (د.ك)</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${itemsHtml}
                  </tbody>
              </table>

              <div class="summary-section">
                  <div style="position: absolute; bottom: 210px; left: 80px; opacity: 0.2; transform: rotate(-10deg); z-index: 10; display: flex; flex-direction: column; align-items: center;">
                      <img src="${data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" style="width: 70px; filter: grayscale(100%) contrast(150%) brightness(0.7); mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.1);" />
                      <div style="font-size: 8px; font-weight: 900; text-align: center; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px; width: 60px; color: #000;">ختم التوثيق</div>
                  </div>
                  <div class="summary-box">
                      <div class="summary-row">
                          <span class="sum-label">المجموع الفرعي</span>
                          <span class="sum-val">${invoiceSubtotal.toFixed(3)} <span class="currency">د.ك</span></span>
                      </div>
                      ${invoiceAddonsTotal > 0 ? `
                      <div class="summary-row">
                          <span class="sum-label">الإضافات</span>
                          <span class="sum-val">${Number(invoiceAddonsTotal).toFixed(3)} <span class="currency">د.ك</span></span>
                      </div>` : ''}
                      ${invoiceDiscount > 0 ? `
                      <div class="summary-row" style="color: #e11d48;">
                          <span class="sum-label" style="color: #e11d48;">الخصم مخصوم</span>
                          <span class="sum-val">-${invoiceDiscount.toFixed(3)} <span class="currency">د.ك</span></span>
                      </div>` : ''}
                      ${invoice.deliveryFee > 0 ? `
                      <div class="summary-row">
                          <span class="sum-label">رسوم التوصيل</span>
                          <span class="sum-val">${Number(invoice.deliveryFee).toFixed(3)} <span class="currency">د.ك</span></span>
                      </div>` : ''}
                      <div class="summary-row total-row">
                          <span class="sum-label">المبلغ المطلوب</span>
                          <span class="sum-val">${Math.max(0, invoiceSubtotal + invoiceAddonsTotal + Number(invoice.deliveryFee || 0) - invoiceDiscount).toFixed(3)} <span class="currency">د.ك</span></span>
                      </div>
                  </div>
              </div>

              <footer>
                  <div class="footer-contact">
                      ${data?.settings?.restaurantNumbers?.length ? `خدمة العملاء: ${data.settings.restaurantNumbers.join(' - ')}` : ''}
                  </div>
              </footer>
          </div>
          <script>
              window.onload = () => {
                  setTimeout(() => {
                      window.print();
                      setTimeout(() => { window.close(); }, 500);
                  }, 500);
              }
          </script>
        </body>
      </html>
    `;
}
