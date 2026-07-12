const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
/const shardRef = getSmartDoc\('appData', user\.uid, user\.email, \`shards\/\$\{key\}\`\);\s*const shardContent = JSON\.parse\(JSON\.stringify\(\{ \[key\]: shardedPayloadsToSave\[key\] \}\)\);\s*console\.log\(\`Saving modified shard '\$\{key\}' to Firestore\.\.\.\`\);\s*savePromises\.push\(setDoc\(shardRef, shardContent, \{ merge: true \}\)\);/s,
`const shardRef = getSmartDoc('appData', user.uid, user.email, \`shards/\${key}\`);
             
             const payloadStr = JSON.stringify(shardedPayloadsToSave[key]);
             let shardContent;
             if (payloadStr.length > 500000) {
                 const compressed = LZString.compressToBase64(payloadStr);
                 shardContent = { compressedData: compressed, isCompressed: true };
                 console.log(\`Compressed shard '\${key}' from \${payloadStr.length} chars to \${compressed.length} chars...\`);
             } else {
                 shardContent = JSON.parse(JSON.stringify({ [key]: shardedPayloadsToSave[key], isCompressed: false }));
             }
             
             console.log(\`Saving modified shard '\${key}' to Firestore...\`);
             // merge: false so old uncompressed arrays don't linger if transitioning
             savePromises.push(setDoc(shardRef, shardContent, { merge: false }));`
);

// We need to also patch the saving side on reset data / first time:
c = c.replace(
/const shardRef = getSmartDoc\('appData', user\.uid, user\.email, \`shards\/\$\{key\}\`\);\s*const shardContent = JSON\.parse\(JSON\.stringify\(\{ \[key\]: shardedPayloads\[key\] \}\)\);\s*savePromises\.push\(setDoc\(shardRef, shardContent, \{ merge: true \}\)\);/s,
`const shardRef = getSmartDoc('appData', user.uid, user.email, \`shards/\${key}\`);
            const payloadStr = JSON.stringify(shardedPayloads[key]);
            let shardContent;
            if (payloadStr.length > 500000) {
                const compressed = LZString.compressToBase64(payloadStr);
                shardContent = { compressedData: compressed, isCompressed: true };
            } else {
                shardContent = JSON.parse(JSON.stringify({ [key]: shardedPayloads[key], isCompressed: false }));
            }
            savePromises.push(setDoc(shardRef, shardContent, { merge: false }));`
);

fs.writeFileSync('src/App.tsx', c);
