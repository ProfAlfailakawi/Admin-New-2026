import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, initializeFirestore } from 'firebase/firestore';
import * as fs from 'fs';
import LZString from 'lz-string';

const activeConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(activeConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function check() {
  const dataRef = doc(db, 'appData', 'shared_company_data');
  console.log("Fetching shared_company_data...");
  const snap = await getDoc(dataRef);
  if (snap.exists()) {
    const rawData = snap.data();
    console.log("Doc exists! Keys:", Object.keys(rawData));
    console.log("Raw doc size roughly:", JSON.stringify(rawData).length, "bytes");
    if (rawData.appDataPayload) {
      let decompressed = LZString.decompressFromBase64(rawData.appDataPayload);
      if (!decompressed || !decompressed.startsWith("{")) {
        decompressed = LZString.decompressFromUTF16(rawData.appDataPayload) || "{}";
      }
      if (decompressed) {
        console.log("Decompressed length:", decompressed.length);
        fs.writeFileSync('temp.json', decompressed);
        const parsed = JSON.parse(decompressed);
        console.log("Keys in data:", Object.keys(parsed));
        ['customers', 'invoices', 'products', 'orders', 'expenses'].forEach(k => {
          if (parsed[k]) console.log(k, "count:", parsed[k].length);
        });
      } else {
        console.log("Failed to decompress.");
      }
    }
  } else {
    console.log("Doc does not exist!");
  }
}

check().catch(console.error).then(() => process.exit(0));
