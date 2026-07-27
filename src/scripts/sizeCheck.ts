import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, initializeFirestore } from 'firebase/firestore';
import * as fs from 'fs';

const activeConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(activeConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, activeConfig.firestoreDatabaseId);

async function check() {
  const dataRef = doc(db, 'appData', 'shared_company_data');
  const snap = await getDoc(dataRef);
  if (snap.exists()) {
    const rawData = snap.data();
    Object.keys(rawData).forEach(k => {
      console.log(k, JSON.stringify(rawData[k]).length, "bytes");
    });
  } 
}

check().catch(console.error).then(() => process.exit(0));
