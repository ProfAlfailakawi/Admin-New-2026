import { GoogleAuthProvider, signInWithCredential, type Auth, type UserCredential } from 'firebase/auth';

// داخل تطبيق iPhone (Capacitor) تُفتح نافذة Google المنبثقة في Safari خارج التطبيق، فيضيع سياق الدخول
// ("missing initial state"). نسجّل الدخول بحساب Google عبر النظام ثم نسلّم رمز الهوية إلى Firebase.
// على الويب لا يتغيّر شيء.

// عميل iOS الذي أنشأه Firebase لتطبيق com.dralfailakawi.alturath.admin (معرّف عام وليس سرًّا).
const IOS_CLIENT_ID = '119610604304-ifli758ngabjl2pam2gslmvgeeovtq1q.apps.googleusercontent.com';

interface SocialLoginPlugin {
  initialize(o: { google: { iOSClientId: string; mode: 'online' } }): Promise<void>;
  login(o: { provider: 'google'; options: { scopes: string[] } }): Promise<{ result?: { idToken?: string | null } }>;
}
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { SocialLogin?: SocialLoginPlugin };
}

const capacitor = (): CapacitorGlobal | undefined => (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;

let initialized: Promise<void> | null = null;

export async function nativeGoogleSignIn(auth: Auth): Promise<UserCredential> {
  const plugin = capacitor()?.Plugins?.SocialLogin;
  if (!plugin) throw Object.assign(new Error('native-google-unavailable'), { code: 'admin/update-app' });
  initialized ??= plugin.initialize({ google: { iOSClientId: IOS_CLIENT_ID, mode: 'online' } });
  await initialized;
  const res = await plugin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
  const idToken = res.result?.idToken;
  if (!idToken) throw Object.assign(new Error('no-id-token'), { code: 'admin/no-id-token' });
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}
