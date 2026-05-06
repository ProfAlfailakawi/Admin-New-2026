const fs = require('fs');

function updateWhatsappMessage(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');

  // Search for the message line
  // \n${promoLine}إجمالي الفاتورة: ...
  const match = file.match(/const message = `\*فاتورة من شركة مطبخ التراث الكويتي\*(.*?)`;/s);
  if (match) {
    let msg = match[1];
    
    // Check if it already has Region/Zone
    if (!msg.includes("العنوان:")) {
      // Find \nالطلب:\n
      const replaceDest = `\\nالطلب:\\n`;
      const regionLine = `\\nالعنوان: \${invoice.address && invoice.address !== 'غير محدد' ? (typeof invoice.address === 'object' ? [\`\${invoice.address.region||''}\`, \`ق\${invoice.address.block||''}\`, \`ش\${invoice.address.street||''}\`, \`م\${invoice.address.building||''}\`].filter(Boolean).join(' ') : invoice.address) : (invoice.deliveryInfo?.zoneName || 'غير محدد')}\\nالطلب:\\n`;
      
      const newMsg = msg.replace(replaceDest, regionLine);
      const replacement = `const message = \`*فاتورة من شركة مطبخ التراث الكويتي*${newMsg}\`;`;
      
      file = file.replace(match[0], replacement);
      console.log(`Updated WhatsApp message in ${filePath}`);
      fs.writeFileSync(filePath, file);
    } else {
      console.log(`WhatsApp message in ${filePath} already has Address`);
    }
  } else {
    console.log(`Could not find message in ${filePath}`);
  }
}

updateWhatsappMessage('src/components/InvoicePage.tsx');
updateWhatsappMessage('src/components/ReportsPage.tsx');
updateWhatsappMessage('src/components/OrderPage.tsx');
