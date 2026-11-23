/**
 * قرار تسجيل الدخول بحساب Google في مكان واحد.
 * داخل غلاف التطبيق الأصلي: إضافة SocialLogin فقط؛ لا نافذة منبثقة ولا إعادة توجيه أبدًا
 * (حتى لو فشلت الإضافة أو غابت، يُرمى الخطأ ولا يُجرَّب مسار الويب).
 * في المتصفح: النافذة المنبثقة ثم إعادة التوجيه عند الحاجة، كما كان.
 */
export interface GoogleSignInDeps<T> {
  native: boolean;
  nativeSignIn: () => Promise<T>;
  popup: () => Promise<T>;
  redirect: () => Promise<unknown>;
  shouldFallbackToRedirect: (err: unknown) => boolean;
}

export async function signInWithGoogle<T>(d: GoogleSignInDeps<T>): Promise<T | null> {
  if (d.native) return d.nativeSignIn();
  try {
    return await d.popup();
  } catch (err) {
    if (d.shouldFallbackToRedirect(err)) {
      await d.redirect();
      return null;
    }
    throw err;
  }
}
