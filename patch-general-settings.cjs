const fs = require('fs');

let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

const regex = /if \(appMode === 'cloud' && currentUser\) \{\s*const dataRef = getSmartDoc\('appData', currentUser\.uid, currentUser\.email\);\s*await deleteDoc\(dataRef\);\s*\}/;

const replacement = `if (appMode === 'cloud' && currentUser) {
      const dataRef = getSmartDoc('appData', currentUser.uid, currentUser.email);
      await deleteDoc(dataRef);
      const SHARDED_KEYS = ['invoices', 'orders', 'customers', 'expenses', 'testimonials', 'products', 'supplierCopies', 'pulseAnalysisHistory', 'pulseReviews', 'campaigns', 'squads', 'promocodes', 'aiLearningMemory', 'pulseArchiveAnalysis', 'deepArchiveAnalysis', 'nameMatchMemory'];
      const deletePromises = SHARDED_KEYS.map(key => {
        const shardRef = getSmartDoc('appData', currentUser.uid, currentUser.email, \`shards/\${key}\`);
        return deleteDoc(shardRef).catch(e => console.warn(\`Shard cleanup skipped for \${key}\`));
      });
      await Promise.all(deletePromises);
    }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/GeneralSettings.tsx', content, 'utf8');
    console.log("Successfully replaced in GeneralSettings.tsx");
} else {
    console.log("Target not found in GeneralSettings.tsx!");
}
