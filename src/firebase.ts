import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  deleteDoc,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { toast } from 'sonner';
import firebaseConfig from '../firebase-applet-config.json';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS } from './constants';

// Suppress Firestore Warnings in dev environment
setLogLevel('error');

// Prevent duplicate initialization
const activeConfig = firebaseConfig;
export const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const storage = getStorage(app);

console.log("Firebase App Initialized with project:", activeConfig.projectId);

// Using initializeFirestore with multi-tab offline local cache and auto-detect long polling which is highly resilient in this environment.
export const db = initializeFirestore(app, { 
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, (firebaseConfig as any).firestoreDatabaseId);
console.log("Firestore initialized with DB ID:", (firebaseConfig as any).firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export const handleFirestoreError = (error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied') {
    const authInfo = {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || '',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      providerInfo: (auth.currentUser?.providerData || []).map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    };
    
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType: operation,
      path: path,
      authInfo
    };
    
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

// Unified collection path for absolute data persistence across environment stages
const getCollectionPath = (path: string) => path;

export const getSmartCollection = (path: string) => collection(db, getCollectionPath(path));
export const getSmartDoc = (path: string, uid: string, userEmail?: string | null) => {
  const email = (userEmail || auth.currentUser?.email)?.toLowerCase()?.trim() || '';
  const currentUid = uid || auth.currentUser?.uid || '';
  const isSharedUser = AUTHORIZED_EMAILS.includes(email) || 
                       AUTHORIZED_PARTNERS.includes(email) || 
                       AUTHORIZED_UIDS.includes(currentUid) || 
                       AUTHORIZED_PARTNER_UIDS.includes(currentUid);
  return doc(db, getCollectionPath(path), isSharedUser ? 'shared_company_data' : uid);
};

export { deleteDoc };

export async function testFirestoreConnection() {
  try {
    // Attempt a lightweight persistent read
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    console.warn("Firestore connection check detail:", {
      code: error.code,
      message: error.message,
      projectId: firebaseConfig.projectId
    });
    
    // We only throw a toast/error if it's a structural failure (not found or unavailable)
    const isServiceDisabled = 
      error.message?.includes('SERVICE_DISABLED') || 
      error.message?.includes('firestore.googleapis.com is not enabled') ||
      error.message?.includes('Cloud Firestore API has not been used') ||
      (error.code === 'permission-denied' && error.message?.includes('disabled'));

    if (isServiceDisabled) {
      toast.error("خدمة Firestore غير مفعلة!", {
        description: "يجب تفعيل Cloud Firestore API من لوحة تحكم Google Cloud ليتمكن التطبيق من العمل.",
        duration: 15000,
        action: {
          label: "تفعيل الخدمة الآن",
          onClick: () => window.open(`https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${activeConfig.projectId}`, '_blank')
        }
      });
    } else if (error.code === 'not-found' || error.message?.includes('5 NOT_FOUND')) {
      toast.error("قاعدة البيانات غير موجودة!", {
        description: `تأكد إن قاعدة Firestore موجودة في مشروعك (${activeConfig.projectId}) على Firebase.`
      });
    } else if (error.code === 'unavailable' || error.message?.includes('the client is offline')) {
      const msg = "نحاول نوصل لقاعدة البيانات...";
      console.warn(msg, "Check if Firestore is provisioned and Database ID is correct.");
      toast.info(msg, {
        description: "إذا استمر الخطأ أكثر من دقيقة، تأكد من إنشاء قاعدة البيانات واختيار Database ID الصحيح من الإعدادات.",
        duration: 8000
      });
    }
  }
}
/* 
  testFirestoreConnection() removed to avoid noise 403 errors and cookie warnings for anonymous users
*/
// testFirestoreConnection();
