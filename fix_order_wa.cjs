const fs = require('fs');
let file = fs.readFileSync('src/components/OrderPage.tsx', 'utf8');

const sMatch = file.match(/const message = `\$\{titleLine\}\\n\\nالعميل: \$\{getOrderCustomerName\(order\) \|\| 'عميل'\}\\n\$\{headerLine\}\\nالطلب:\\n\$\{items\}\\n\\n.*?`;/s);

if (sMatch) {
  const replacement = `const addressLine = (order as any).address ? \`\\nالعنوان: \${(order as any).address}\` : (linkedInvoice?.address && linkedInvoice.address !== 'غير محدد') ? \`\\nالعنوان: \${typeof linkedInvoice.address === 'object' ? [\`\${linkedInvoice.address.region||''}\`, \`ق\${linkedInvoice.address.block||''}\`, \`ش\${linkedInvoice.address.street||''}\`, \`م\${linkedInvoice.address.building||''}\`].filter(Boolean).join(' ') : linkedInvoice.address}\` : linkedInvoice?.deliveryInfo?.zoneName ? \`\\nالعنوان: \${linkedInvoice.deliveryInfo.zoneName}\` : '';
const message = \`\${titleLine}\\n\\nالعميل: \${getOrderCustomerName(order) || 'عميل'} \${addressLine}\\n\${headerLine}\\nالطلب:\\n\${items}\\n\\nالمجموع: \${subtotal.toFixed(3)} د.ك\\nرسوم التوصيل: \${Number(deliveryFee).toFixed(3)} د.ك\\n\${promoLine}\${footerLine}\${paymentLinkLine}\\n\\nشكراً لتعاملكم معنا!\`;`;
  file = file.replace(sMatch[0], replacement);
  fs.writeFileSync('src/components/OrderPage.tsx', file);
  console.log("Updated OrderPage");
}
