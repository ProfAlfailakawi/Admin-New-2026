const fs = require('fs');

let content = fs.readFileSync('src/lib/utils.ts', 'utf8');

const regex = /export function joinProductsFromDatabase\(data: any\): any \{\s*if \(\!data\) return data;\s*const result = \{ \.\.\.data \};\s*if \(result\.supplierCopies && Array\.isArray\(result\.supplierCopies\)\) \{\s*result\.products = \[\.\.\.\(result\.products \|\| \[\]\), \.\.\.result\.supplierCopies\];\s*delete result\.supplierCopies;\s*\}\s*return result;\s*\}/;

const replacement = `export function joinProductsFromDatabase(data: any): any {
  if (!data) return data;
  const result = { ...data };
  if (result.supplierCopies && Array.isArray(result.supplierCopies)) {
      const combined = [...(result.products || []), ...result.supplierCopies];
      const unique = [];
      const seen = new Set();
      for (const p of combined) {
          if (!p || !p.id) { unique.push(p); continue; }
          if (!seen.has(p.id)) {
              seen.add(p.id);
              unique.push(p);
          }
      }
      result.products = unique;
      delete result.supplierCopies;
  }
  return result;
}`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/lib/utils.ts', content, 'utf8');
    console.log("Successfully replaced in utils.ts");
} else {
    console.log("Target not found in utils.ts!");
}
