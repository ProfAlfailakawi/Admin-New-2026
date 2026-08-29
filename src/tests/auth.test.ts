import { describe, it, expect, vi } from 'vitest';
import { getSmartDoc } from '../firebase';

// Mock the constants to simulate authorization rules
vi.mock('../constants', () => ({
  AUTHORIZED_EMAILS: ['admin@alturath.app'],
  AUTHORIZED_PARTNERS: ['partner@alturath.app'],
  AUTHORIZED_UIDS: ['admin_uid'],
  AUTHORIZED_PARTNER_UIDS: ['partner_uid']
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      email: 'admin@alturath.app',
      uid: 'admin_uid'
    }
  }),
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  setPersistence: vi.fn().mockResolvedValue(true),
  browserLocalPersistence: {}
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
  getApp: vi.fn()
}));

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn((db, path, id, ...rest) => ({ path, id, rest })),
    setDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
    getDocFromServer: vi.fn(),
    deleteDoc: vi.fn(),
    setLogLevel: vi.fn(),
    memoryLocalCache: vi.fn()
  }
});

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn()
}));

describe('Authorization Rules', () => {
  it('Should route admin users to shared_company_data by default', () => {
    // Assuming 'ktk_use_individual_storage' is false (default for admin)
    const docRef: any = getSmartDoc('invoices', 'some_id', 'admin@alturath.app');
    expect(docRef.id).toBe('shared_company_data');
  });

  it('Should use specific user uid if not admin/partner', () => {
    const docRef: any = getSmartDoc('invoices', 'customer_uid', 'customer@gmail.com');
    expect(docRef.id).toBe('customer_uid');
  });
});
