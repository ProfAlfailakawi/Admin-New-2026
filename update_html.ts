const fs = require('fs');
let content = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const searchHtml = /const itemsHtml = \(lastInvoice\?\.items \|\| \[\]\)\.map\(item => \{[\s\S]*?return `/g;
const replacementHtml = `const itemsHtml = (lastInvoice?.items || []).map(item => {
    const product = (data?.products || []).find(p => p.id === item.productId);
    let originalPrice = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (product?.price || 0));
    let displayPrice = Number(originalPrice);
    
    let addonsHtml = '';
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach((addon: any) => {
        let addonQty = 0;
        if (addon.calculationType === 'per_item') addonQty = item.quantity;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.floor(item.quantity / (addon.xItemsThreshold || 1));
        else if (addon.calculationType === 'fixed') addonQty = 1;
        
        if (addonQty > 0) {
           if (addon.isHiddenPrice) {
               displayPrice += (Number(addon.price) * addonQty) / (item.quantity || 1);
               addonsHtml += '<div class="item-cat" style="color:#4b5563; margin-top:2px; font-size:12px;">+ ' + addon.name + (addonQty > 1 ? ' (' + addonQty + ')' : '') + '</div>';
           } else {
               addonsHtml += '<div class="item-cat" style="color:#4b5563; margin-top:2px; font-size:12px;">+ ' + addon.name + (addonQty > 1 ? ' (' + addonQty + ')' : '') + ' - (' + (Number(addon.price) * addonQty).toFixed(3) + ' د.ك)</div>';
           }
        }
      });
    }

    return \``;

content = content.replace(searchHtml, replacementHtml);
content = content.replace(/\<div class="item-name"\>\$\{product\?\.name \|\| 'منتج غير معروف'\}\<\/div>/g, '<div class="item-name">${product?.name || \'منتج غير معروف\'}</div>\n              ${addonsHtml}');
content = content.replace(/\$\{Number\(price\)\.toFixed\(3\)\}/g, '${Number(displayPrice).toFixed(3)}');

fs.writeFileSync('src/components/InvoicePage.tsx', content);
console.log('Success HTML');
