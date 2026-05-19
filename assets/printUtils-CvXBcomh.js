const d=t=>String(t??"").replace(/[٠-٩]/g,r=>String("٠١٢٣٤٥٦٧٨٩".indexOf(r))).replace(/[۰-۹]/g,r=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(r))),F=t=>{const r=t?new Date(t):new Date,e=new Intl.DateTimeFormat("en-US",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:!0,timeZone:"Asia/Kuwait"}).format(r).replace(","," - ");return d(e).replace(/\s(am|pm)$/i,o=>o.toUpperCase())},p=t=>`${d(Number(t||0).toFixed(3))} د.ك`,s=t=>t==null?"":String(t).trim(),N=(t,r)=>{if(!t||t==="غير محدد")return s(r)||"غير محدد";if(typeof t=="string"){const e=t.trim();if(!e)return s(r)||"غير محدد";try{const o=JSON.parse(e);return N(o,r)}catch{return e}}if(typeof t=="object"){const e=t.region||t.area||t.block||t.street||t.building||t.house?t:Object.values(t||{}).find(n=>n&&typeof n=="object")||t;return[s(e.region||e.area||e.governorate),s(e.block)?`قطعة ${e.block}`:"",s(e.street)?`شارع ${e.street}`:"",s(e.jaddah)?`جادة ${e.jaddah}`:"",s(e.building||e.house)?`منزل ${s(e.building||e.house)}`:"",s(e.floor)?`دور ${e.floor}`:"",s(e.apartment)?`شقة ${e.apartment}`:""].filter(Boolean).join(" - ")||s(r)||"غير محدد"}return s(r)||"غير محدد"},k=(t,r)=>{let e=Number((t==null?void 0:t.quantity)??(t==null?void 0:t.qty)??0);e||((t==null?void 0:t.calculationType)==="fixed"?e=1:(t==null?void 0:t.calculationType)==="per_x_items"?e=Math.ceil(r/Math.max(1,Number((t==null?void 0:t.xItemsThreshold)||1))):e=r);const o=Number((t==null?void 0:t.minQuantity)||0),n=Number((t==null?void 0:t.maxQuantity)||e||0);return o&&(e=Math.max(o,e)),n&&(e=Math.min(n,e)),Math.max(0,e)},Q=(t,r)=>{const e=k(t,r),o=Number((t==null?void 0:t.freeQuantity)||0);return Number(((t==null?void 0:t.total)??(t==null?void 0:t.amount)??Number((t==null?void 0:t.price)||0)*Math.max(0,e-o))||0)};function H(t,r){var b;const e=(r==null?void 0:r.customers)||[],o=(r==null?void 0:r.products)||[],n=e.find(a=>a.id===t.customerId),A=t.date||t.createdAt||new Date().toISOString(),l=t.paymentStatus||t.status||"مدفوعة",g=String(l).toLowerCase(),j=g.includes("pending")||g.includes("انتظار")?"pending-status":g.includes("paid")||String(l).includes("مدفوع")||String(l).includes("مدفوعة")?"paid-status":"other-status",S=s((n==null?void 0:n.name)||t.customerName)||"عميل",T=s((n==null?void 0:n.phone)||t.customerPhone||t.phone),D=N(t.address||(n==null?void 0:n.address),(b=t.deliveryInfo)==null?void 0:b.zoneName);let x=0,f=0;const I=(t.items||[]).map((a,O)=>{const h=o.find(i=>i.id===a.productId)||{},q=s(a.name||a.productName||h.name)||"منتج غير معروف",c=Number(a.quantity||1),w=Number(a.priceAtTime??a.price??h.price??0),v=w*c;x+=v;const y=(Array.isArray(a.addons)?a.addons:Array.isArray(a.selectedAddons)?a.selectedAddons:Array.isArray(a.addOns)?a.addOns:Array.isArray(a.extras)?a.extras:[]).map(i=>{const C=s((i==null?void 0:i.name)||(i==null?void 0:i.title)||(i==null?void 0:i.label))||"إضافة",$=k(i,c),z=Q(i,c);return f+=z,`
        <div class="addon-line">
          <span><b>•</b> ${C}${$>1?` × ${$}`:""}</span>
          <span class="addon-price">${p(z)}</span>
        </div>`}).join("");return`
      <tr class="item-row">
        <td class="product-cell">
          <div class="product-name"><span class="item-number">${O+1}.</span> ${q}</div>
          ${y?`<div class="addons-wrap">${y}</div>`:""}
          ${a.itemNotes?`<div class="item-note">${a.itemNotes}</div>`:""}
        </td>
        <td class="center">${c}</td>
        <td class="money">${p(w)}</td>
        <td class="money strong">${p(v)}</td>
      </tr>`}).join(""),m=Number(t.deliveryFee||0),u=Number(t.discount||0),M=Math.max(0,Number(t.totalAmount??x+f+m-u));return`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة ${t.id||""}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{--green:#0f4f2d;--green2:#0b3f25;--red:#d7192f;--gold:#d7a94f;--soft:#fbfaf6;--line:#eadfcd;--text:#172033;--muted:#6b7280;}
    *{box-sizing:border-box} body{margin:0;padding:28px;background:#f3f4f6;font-family:'Cairo',Arial,sans-serif;color:var(--text);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{max-width:900px;margin:auto;background:#fff;border:1px solid #eee1cc;border-radius:22px;padding:34px 38px 28px;box-shadow:0 18px 50px rgba(15,79,45,.10);position:relative;overflow:hidden;}
    .page:before{content:'';position:absolute;inset:0 0 auto 0;height:5px;background:linear-gradient(90deg,var(--red),var(--green),var(--gold));opacity:.8}
    .header{display:grid;grid-template-columns:130px 1fr 190px;align-items:center;gap:22px;padding-bottom:22px;border-bottom:1px solid var(--line);}
    .logo{width:116px;height:116px;object-fit:contain;justify-self:center;}
    .brand{text-align:center}.brand h1{margin:0;color:var(--green);font-size:38px;line-height:1.1;font-weight:900;letter-spacing:-1px}.tagline{margin-top:8px;color:#b88a31;font-weight:700;font-size:15px}.contacts{margin-top:16px;display:flex;justify-content:center;gap:18px;direction:ltr;color:#263143;font-weight:700}.contacts span{display:flex;align-items:center;gap:6px}.badge{background:linear-gradient(145deg,var(--green),var(--green2));color:#fff;border:2px solid var(--gold);border-radius:18px;padding:18px 14px;text-align:center;box-shadow:0 8px 22px rgba(15,79,45,.18)}.badge .title{font-size:30px;font-weight:900}.badge .sub{font-size:13px;color:#f4d986;font-weight:800;margin-top:5px}
    .pattern{height:18px;margin:14px -38px 24px;background:repeating-linear-gradient(45deg,rgba(215,169,79,.26) 0 8px,transparent 8px 17px),linear-gradient(90deg,rgba(215,25,47,.05),rgba(15,79,45,.05));border-block:1px solid rgba(215,169,79,.25)}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:22px}.card{border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,79,45,.05);padding:22px}.card h2{margin:0 0 16px;color:var(--green);font-size:22px;font-weight:900;display:flex;align-items:center;gap:9px}.card h2 .icon{color:var(--red);font-size:22px}.row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eee7dc}.row:last-child{border-bottom:0}.label{color:#555;font-weight:700}.value{font-weight:800;text-align:left;direction:rtl}.ltr{direction:ltr!important;unicode-bidi:embed;text-align:left;white-space:nowrap}.status{font-weight:900}.paid-status{color:var(--green)}.pending-status{color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:2px 10px}.other-status{color:#475569}
    .table-wrap{border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-top:8px;background:#fff}table{width:100%;border-collapse:collapse}.head th{background:linear-gradient(180deg,var(--green),#0b4327);color:#f7d880;font-size:15px;padding:15px 12px;text-align:center;font-weight:900}.head th:first-child{text-align:right}.item-row td{padding:20px 14px;border-bottom:1px dashed #dccfbc;vertical-align:top}.item-row:last-child td{border-bottom:0}.product-cell{width:45%}.product-name{font-size:22px;font-weight:900;color:#111827}.item-number{color:var(--red);margin-left:6px}.addons-wrap{margin-top:10px;display:grid;gap:5px}.addon-line{display:flex;justify-content:space-between;gap:12px;color:#343b48;font-weight:700;font-size:14px}.addon-line b{color:var(--red);font-size:18px;line-height:0}.addon-price{color:#a17622;white-space:nowrap}.center{text-align:center;font-size:20px;font-weight:800}.money{text-align:center;font-weight:800;direction:ltr;white-space:nowrap}.strong{color:var(--green);font-size:18px}.item-note{margin-top:8px;color:#b45309;font-size:13px;font-weight:700}
    .summary{margin-top:22px;border:1px solid #e4d2b4;border-radius:18px;background:linear-gradient(135deg,#fffdf8,#fbf4e7);padding:22px;display:grid;grid-template-columns:1fr 1.1fr;gap:22px;align-items:center}.sum-lines{display:grid;gap:10px}.sum-row{display:flex;justify-content:space-between;border-bottom:1px dashed #ddcfba;padding-bottom:9px;font-weight:800}.sum-row span:first-child{color:#374151}.sum-row span:last-child{direction:ltr}.total-box{background:linear-gradient(145deg,var(--green),#093a22);border:2px solid var(--gold);border-radius:16px;padding:18px 24px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;box-shadow:0 10px 26px rgba(15,79,45,.16)}.total-title{font-size:26px;font-weight:900}.total-amount{font-size:31px;font-weight:900;color:#ffd96a;direction:ltr}.ornament{height:92px;background:url('/logo.png') center/contain no-repeat;opacity:.18;filter:saturate(.8)}
    .footer{margin-top:22px;background:linear-gradient(145deg,#0d4b2c,#08371f);color:#fff;border:2px solid var(--gold);border-radius:18px;padding:18px;text-align:center;font-weight:800}.footer small{display:block;color:#e8d5a1;margin-top:4px;font-size:12px}.no-print{margin-top:18px;text-align:center}.print-btn{border:0;border-radius:999px;background:var(--green);color:#fff;font-weight:900;padding:12px 28px;cursor:pointer;font-family:inherit}
    @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;border:0;max-width:none;min-height:100vh}.no-print{display:none}.header{grid-template-columns:115px 1fr 170px}.brand h1{font-size:34px}}
    @media (max-width:760px){body{padding:10px}.page{padding:20px}.header{grid-template-columns:1fr;text-align:center}.badge{max-width:220px;margin:auto}.cards{grid-template-columns:1fr}.pattern{margin-inline:-20px}.contacts{flex-wrap:wrap}.summary{grid-template-columns:1fr}.product-name{font-size:18px}.head th,.item-row td{font-size:13px;padding:12px 8px}.total-box{flex-direction:column}.brand h1{font-size:30px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <img class="logo" src="/logo.png" alt="مطبخ التراث الكويتي" />
      <div class="brand">
        <h1>مطبخ التراث الكويتي</h1>
        <div class="tagline">أصالة الطعم.. من تراثنا الكويتي</div>
      </div>
      <div class="badge"><div class="title">فاتورة</div><div class="sub">شكراً لتسوقكم معنا</div></div>
    </section>
    <div class="pattern"></div>

    <section class="cards">
      <div class="card">
        <h2><span class="icon">☰</span> تفاصيل الفاتورة</h2>
        <div class="row"><span class="label">رقم الفاتورة</span><span class="value">${d(t.id||"-")}</span></div>
        <div class="row"><span class="label">التاريخ والوقت</span><span class="value ltr">${F(A)}</span></div>
        <div class="row"><span class="label">الحالة</span><span class="value status ${j}">${d(l)}</span></div>
      </div>
      <div class="card">
        <h2><span class="icon">♡</span> معلومات العميل</h2>
        <div class="row"><span class="label">اسم العميل</span><span class="value">${S}</span></div>
        <div class="row"><span class="label">رقم الهاتف</span><span class="value">${T||"-"}</span></div>
        <div class="row"><span class="label">العنوان</span><span class="value">${D}</span></div>
      </div>
    </section>

    <section class="table-wrap">
      <table>
        <thead class="head"><tr><th>المنتج / الإضافات</th><th>الكمية</th><th>السعر الفردي</th><th>إجمالي المنتج</th></tr></thead>
        <tbody>${I||'<tr class="item-row"><td colspan="4" class="center">لا توجد منتجات</td></tr>'}</tbody>
      </table>
    </section>

    <section class="summary">
      <div class="ornament"></div>
      <div class="sum-lines">
        <div class="sum-row"><span>إجمالي المنتجات</span><span>${p(x)}</span></div>
        <div class="sum-row"><span>إجمالي الإضافات</span><span>${p(f)}</span></div>
        ${u>0?`<div class="sum-row"><span>الخصم</span><span>${p(u)}</span></div>`:""}
        <div class="sum-row"><span>التوصيل</span><span>${p(m)}</span></div>
      </div>
      <div class="total-box" style="grid-column:1 / -1"><span class="total-title">الإجمالي النهائي</span><span class="total-amount">${p(M)}</span></div>
    </section>

    <footer class="footer">شكراً لتعاملكم معنا</footer>
    <div class="no-print"><button class="print-btn" onclick="window.print()">طباعة / حفظ PDF</button></div>
  </main>
</body>
</html>`}export{H as generateInvoiceHTML};
