const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
/const shardData = shardSnap\.data\(\);\s*if \(shardData && shardData\[key\] \!\=\= undefined\) \{/s,
`const shardData = shardSnap.data();
               let parsedData;
               if (shardData?.isCompressed && shardData.compressedData) {
                   try { 
                     const decompressed = LZString.decompressFromBase64(shardData.compressedData);
                     if (decompressed) parsedData = JSON.parse(decompressed);
                   } catch(e) { console.error("Decompress failed for", key, e); }
               } else if (shardData && shardData[key] !== undefined) {
                   parsedData = shardData[key];
               }
               
               if (parsedData !== undefined) {
                  // We map shardData[key] to parsedData in the lines below:`
);

c = c.replace(
/lastRemoteKeysRef\.current\[key\] = stableStringify\(shardData\[key\]\);\s*setData\(prev => \{\s*const updated = \{ \.\.\.prev, \[key\]: shardData\[key\] \};/s,
`lastRemoteKeysRef.current[key] = stableStringify(parsedData);

                  setData(prev => {
                     const updated = { ...prev, [key]: parsedData };`
);

fs.writeFileSync('src/App.tsx', c);
