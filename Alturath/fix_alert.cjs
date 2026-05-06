const fs = require('fs');
let content = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const search = `{/* Supplier Alert mobile */}
 <div className="z-20">
 {getBestPriceInfo(product) && (`;

const replace = `{/* Supplier Alert mobile */}
 <div className="z-20 absolute -top-1 right-1">
 {getBestPriceInfo(product) && (`;

let updated = content.replace(search, replace);
if (updated !== content) {
    fs.writeFileSync('src/components/InvoicePage.tsx', updated);
    console.log("Alert absolute position applied successfully.");
} else {
    console.log("Could not find search string for alert.");
}
