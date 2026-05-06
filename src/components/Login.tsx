import React, { useState } from 'react';
import { ShoppingCart, Lock, User, ArrowLeft, Chrome } from 'lucide-react';
import { motion } from 'motion/react';
import LogoEngine from './ui/LogoEngine';
import { loginWithGoogle } from '../firebase';

interface LoginProps {
 onLogin: (mode: 'local' | 'cloud') => void;
 logo?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, logo }) => {
 const [username, setUsername] = useState('admin');
 const [password, setPassword] = useState('Alturath');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handleLogin = (e: React.FormEvent) => {
 e.preventDefault();
 if (username === 'admin' && password === 'Alturath') {
 onLogin('local');
 } else {
 setError('اسم المستخدم أو كلمة المرور غير صحيحة');
 }
 };

 const handleGoogleLogin = async () => {
 setLoading(true);
 setError('');
 try {
 localStorage.setItem('appMode', 'cloud');
 await loginWithGoogle();
 // onLogin is removed here because App.tsx will handle the state transition 
 // via onAuthStateChanged only after verifying the email against AUTHORIZED_EMAILS
 } catch (err: any) {
 const errString = String(err).toLowerCase();
 if (errString.includes('popup-closed-by-user') || errString.includes('cancelled by the user')) {
 // Do nothing if user closed the popup or cancelled - no need to log
 return;
 }
 if (errString.includes('popup-blocked')) {
 setError('تم فتح النافذة في وضع مقيد. يرجى الضغط على زر"Open in new tab" في أعلى اليمين (AI Studio)، أو السماح بالنوافذ المنبثقة.');
 return;
 }
 if (errString.includes('network-request-failed')) {
 setError('فشل الاتصال بخوادم الدخول. يرجى التأكد من اتصالك بالإنترنت وإيقاف أي برامج حظر الإعلانات (Ad-blocker).');
 return;
 }
 if (errString.includes('internal-error')) {
 setError('حدث خطأ داخلي في نظام الدخول. 1- يرجى التأكد من تحديد (Support Email) في إعدادات Firebase 2- افتح التطبيق في نافذة جديدة (Open in new tab).');
 return;
 }
 console.error('Login error:', err);
 setError(`فشل تسجيل الدخول. الخطأ: ${err.message || String(err)}`);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 arabic-font" dir="rtl">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="max-w-md w-full"
 >
 <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200/60 relative">
 <div className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 p-3 md:p-4 md:p-3 md:p-4 text-center text-white relative overflow-hidden">
 {/* Ambient Background Glows */}
 <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
 <div className="absolute -top-3 md:p-4 -left-10 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] animate-pulse" />
 <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-amber-500 rounded-full blur-[100px]" />
 </div>
 
 {/* Smart Logo Treatment Engine (Main Logo) */}
 <LogoEngine 
 src={logo} 
 size="xl" 
 variant="royal"
 className="mx-auto mb-8"
 />

 <h1 className="text-xl md:text-3xl font-black mb-2 relative z-10 tracking-tight">نظام مطبخ التراث</h1>
 <p className="text-white/50 relative z-10 font-bold text-[10px] uppercase">Smart Cloud Accounting Engine</p>
 </div>

 <div className="p-3 md:p-3 space-y-6">
 {localStorage.getItem('appMode') === 'cloud' && (
 <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm font-bold text-center border border-blue-100">
 لقد استخدمت التخزين السحابي مؤخراً. يرجى تسجيل الدخول بـ Google للوصول لبياناتك.
 </div>
)}
 <button 
 onClick={handleGoogleLogin}
 disabled={loading}
 className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg border border-transparent transition-all active:scale-[0.98] flex items-center justify-center gap-3"
 >
 <Chrome size={20} className="text-white" />
 <span>{loading ? 'جاري التحميل...' : 'تسجيل الدخول السحابي (Google)'}</span>
 </button>

 <div className="relative flex items-center gap-4 text-slate-400 py-2">
 <div className="flex-1 h-[1px] bg-slate-100" />
 <span className="text-[10px] font-bold uppercase">أو التخزين المحلي فقط للتجربة</span>
 <div className="flex-1 h-[1px] bg-slate-100" />
 </div>

 <form onSubmit={handleLogin} className="space-y-4">
 <div className="space-y-4">
 <div className="relative group">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block mr-1">اسم المستخدم</label>
 <div className="relative">
 <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
 <input 
 type="text" 
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium"
 placeholder="أدخل اسم المستخدم"
 required
 />
 </div>
 </div>

 <div className="relative group">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block mr-1">كلمة المرور</label>
 <div className="relative">
 <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
 <input 
 type="password" 
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium"
 placeholder="••••••••"
 required
 />
 </div>
 </div>
 </div>

 {error && (
 <motion.div 
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2"
 >
 <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
 {error}
 </motion.div>
)}

 <button 
 type="submit"
 className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
 >
 <span>دخول محلي</span>
 <ArrowLeft size={18} />
 </button>
 </form>
 
 <p className="text-center text-slate-400 text-[10px] font-medium leading-relaxed">
 عند تسجيل الدخول عبر Google، سيتم حفظ بياناتك في السحابة ومزامنتها تلقائياً عبر جميع أجهزتك لضمان عدم فقدانها.
 </p>
 </div>
 </div>
 
 <div className="mt-8 text-center text-slate-400 text-sm font-medium">
 شركة مطبخ التراث الكويتي &copy; {new Date().getFullYear()}
 </div>
 </motion.div>
 </div>
);
};

export default Login;
