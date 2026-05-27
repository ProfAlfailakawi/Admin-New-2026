import React, { useState, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Gift, Target, TrendingUp, Sparkles, AlertTriangle, Plus, X, ShoppingBag, BadgePercent, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { cn, normalizeArabicNumerals, normalizeArabic } from '../lib/utils';

// Lazy load heavy components if needed, or simply optimize current render
// In this case, optimizing the rendering of the product list should be enough.

interface SmartOffersCalculatorProps {
 data: any;
}

export const SmartOffersCalculator: React.FC<SmartOffersCalculatorProps> = ({ data }) => {
 const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
 const [discountPercent, setDiscountPercent] = useState<number>(15);
 const [searchTerm, setSearchTerm] = useState<string>('');

 const products = useMemo(() => data?.products || [], [data?.products]);
 
 const filteredProducts = useMemo(() => {
 return products.filter((p: any) => normalizeArabic(p.name).includes(normalizeArabic(searchTerm)));
 }, [products, searchTerm]);
 
 const selectedProducts = useMemo(() => {
 return selectedProductIds.map(id => products.find((p: any) => p.id === id)).filter(Boolean);
 }, [selectedProductIds, products]);

 const totalOriginalPrice = useMemo(() => {
 return selectedProducts.reduce((sum, p) => sum + p.price, 0);
 }, [selectedProducts]);

 const totalCost = useMemo(() => {
 return selectedProducts.reduce((sum, p) => sum + (p.cost || 0), 0);
 }, [selectedProducts]);

 const offerPrice = useMemo(() => {
 return totalOriginalPrice * (1 - (discountPercent / 100));
 }, [totalOriginalPrice, discountPercent]);

 const offerMargin = useMemo(() => {
 if (offerPrice === 0) return 0;
 return ((offerPrice - totalCost) / offerPrice) * 100;
 }, [offerPrice, totalCost]);

 const originalMargin = useMemo(() => {
 if (totalOriginalPrice === 0) return 0;
 return ((totalOriginalPrice - totalCost) / totalOriginalPrice) * 100;
 }, [totalOriginalPrice, totalCost]);

 const toggleProduct = (id: string) => {
 setSelectedProductIds(prev => 
 prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
);
 };

 const aiAnalysis = useMemo(() => {
 if (selectedProducts.length === 0) return null;
 
 // Heuristics for recommendations based on Kuwaiti terminology
 const names = selectedProducts.map(p => p.name.toLowerCase());
 const hasMain = names.some(n => n.includes('مجبوس') || n.includes('برياني') || n.includes('صينية'));
 const hasSide = names.some(n => n.includes('ورق عنب') || n.includes('سلطة') || n.includes('مقبلات') || n.includes('سمبوسة'));
 const hasSweet = names.some(n => n.includes('حلو') || n.includes('كيك') || n.includes('لقيمات'));
 
 let advice ="";
 let title ="باقة مخصصة";
 
 if (selectedProducts.length === 1) {
 title ="عرض الصنف الواحد 🎯";
 advice ="حلو تسوي عرض على صنف واحد للترويج، بس الأفضل تدمجه مع أصناف ثانية عشان ترفع قيمة السلة (AOV) وتطلع بفايدة أكبر.";
 } else if (hasMain && hasSide && hasSweet) {
 title ="باقة العائلة المتكاملة 👨‍👩‍👧‍👦";
 advice ="ولا غلطة! دامج الرئيسي مع السايد والحلو، هالعرض بيسكر ملف العزايم وزوارة الخميس. تسعيرتك ذكية وتقدر تسوقه كـ (عرض اليمعة).";
 } else if (hasMain && hasSide) {
 title ="باقة الغداء الناطعة 🍛";
 advice ="تركيبة ممتازة! الورق عنب أو المقبلات مع المجبوس من أكثر الكومبوهات اللي تنطلب، أنصحك تضيف معاهم مشروب مجاني ترفع فيه القيمة المضافة بدون ما يأثر على الكوست.";
 } else if (hasSweet) {
 title ="باقة الحلى والقهوة ☕";
 advice ="باقة تبرد الجبد للدوامات أو العصاري. حاول تستهدف فيها فترات العصر والقهوة، نسبة الخصم اللي حاطها ممتازة لجذب زباين جدد.";
 } else {
 title ="باقة التوفير الذكية ✨";
 advice ="اختيار موفق، تأكد بس إن الأصناف هذي تطلب مع بعض دايماً. نسبة الخصم مالتك ممتازة ومحافظ على هامش ربح زين.";
 }

 if (offerMargin < 30) {
 advice +=" بس انتبه ⚠️ هامش الربح شوي نزل عن 30%.. تأكد إن الكمية اللي بتبيعها بتعوض النزول بالربحية.";
 }

 // User philosophy: Price must be accessible (under 15 KWD)
 if (offerPrice > 15) {
   advice += " 💡 نصيحة التراث: السعر حالياً فوق 15 د.ك. حاول تدمج أصناف مختلفة أو تزيد الخصم عشان يوصل السعر لمستوى 'متناول الجميع' ويجذب شريحة أكبر.";
 } else if (offerPrice > 0) {
   advice += " ✅ السعر ممتاز (أقل من 15 د.ك).. هذا النوع من العروض يعتبر 'بمتناول الجميع' وسهل القرار فيه للعملاء.";
 }

 return { title, advice };
 }, [selectedProducts, offerMargin, offerPrice]);

 return (
 <div className="bg-white/60 backdrop-blur-3xl rounded-3xl md:rounded-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-3 md:p-4 md:p-3 relative overflow-hidden" dir="rtl">
 {/* Background Decor */}
 <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
 <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

 <div className="flex items-center gap-4 mb-10 relative z-10">
 <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 text-white">
 <Calculator size={28} />
 </div>
 <div>
 <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">حاسبة العروض الذكية</h2>
 <p className="text-slate-500 font-bold mt-1 text-sm md:text-base">صمم باقات عروضك (Combos) وحلل ربحيتها قبل إطلاقها بالسوق الكويتي.</p>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:p-3 relative z-10">
 {/* Left Side: Product Selection & Configuration */}
 <div className="space-y-8">
 <div className="bg-white/50 border border-slate-200/60 rounded-2xl p-3 md:p-4 shadow-sm">
 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
 <ShoppingBag size={20} className="text-indigo-500" />
 كون الباقة (اختر الأصناف)
 </h3>
 
 <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar p-2">
 <input
 type="text"
 placeholder="ابحث عن منتج..."
 className="w-full px-4 py-2 rounded-xl border border-slate-200/60 mb-2"
 value={searchTerm}
 onChange={(e) => setSearchTerm(normalizeArabicNumerals(e.target.value))}
 />
 {filteredProducts.slice(0, 60).map((product: any) => {
 const isSelected = selectedProductIds.includes(product.id);
 return (
 <button
 key={product.id}
 onClick={() => toggleProduct(product.id)}
 className={cn(
"px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border",
 isSelected 
 ?"bg-indigo-600 text-white border-indigo-500 shadow-md transform scale-[1.02]" 
 :"bg-white text-slate-600 border-slate-200/60 hover:border-indigo-300 hover:bg-indigo-50"
)}
 >
 {product.name}
 {isSelected ? <X size={14} className="opacity-70" /> : <Plus size={14} className="opacity-70" />}
 </button>
);
 })}
 </div>

 {selectedProducts.length > 0 && (
 <div className="space-y-6 border-t border-slate-200/60/50 pt-6">
 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
 <BadgePercent size={20} className="text-amber-500" />
 نسبة تخفيض الباقة
 </h3>
 <div className="space-y-4">
 <div className="flex justify-between items-center text-sm font-bold text-slate-600">
 <span>سعر التكلفة: {Number(totalCost || 0).toFixed(3)} د.ك</span>
 <span>السعر الأصلي: {Number(totalOriginalPrice || 0).toFixed(3)} د.ك</span>
 </div>
 <div className="relative pt-6 pb-2">
 <input 
 type="range" 
 min="0" 
 max="50" 
 value={discountPercent} 
 onChange={(e) => setDiscountPercent(Number(e.target.value))}
 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
 />
 <div className="absolute top-0 left-0 right-0 flex justify-between px-1 pointer-events-none">
 <div className="flex-1 flex justify-center mt-[-20px]">
 <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg" style={{ marginLeft: `calc(${discountPercent}% - 50%)` }}>
 خصم {discountPercent}%
 </span>
 </div>
 </div>
 <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2">
 <span>بدون خصم</span>
 <span>خصم 25%</span>
 <span>خصم 50%</span>
 </div>
 </div>
 </div>
 </div>
)}
 </div>
 </div>

 {/* Right Side: Results & Smart Analysis */}
 <div className="space-y-6">
 {selectedProducts.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-center p-3 md:p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
 <div className="w-12 md:w-20 h-12 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
 <Gift size={32} className="text-slate-500" />
 </div>
 <h3 className="text-lg font-bold text-slate-600 mb-2">اختر أصناف الباقة للبدء</h3>
 <p className="text-slate-500 text-sm font-bold">قم باختيار المنتجات من القائمة لتكوين عرض وحساب هوامش الربح.</p>
 </div>
) : (
 <AnimatePresence mode="popLayout">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="grid grid-cols-2 gap-4"
 >
 <div className="col-span-2 bg-gradient-to-l from-slate-900 to-slate-800 p-3 md:p-4 md:p-3 rounded-2xl text-white relative overflow-hidden shadow-xl">
 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
 <h3 className="text-amber-400 text-sm font-bold mb-2 uppercase">سعر الباقة المقترح</h3>
 <div className="flex items-end gap-3 mb-1">
 <span className="text-xl md:text-3xl md:text-3xl md:text-xl md:text-2xl font-bold">{Number(offerPrice || 0).toFixed(3)}</span>
 <span className="text-xl font-bold text-slate-500 mb-1">د.ك</span>
 </div>
 <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
 <span className="line-through opacity-50">{Number(totalOriginalPrice || 0).toFixed(3)} د.ك</span>
 <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-lg border border-rose-500/20 text-xs">توفير {Number((totalOriginalPrice || 0) - (offerPrice || 0)).toFixed(3)} د.ك</span>
 </div>
 </div>

 <div className={cn(
"p-3 md:p-4 rounded-2xl border relative overflow-hidden flex flex-col justify-between",
 offerMargin >= 35 ?"bg-emerald-50 border-emerald-100" : 
 offerMargin >= 20 ?"bg-amber-50 border-amber-100" : 
"bg-rose-50 border-rose-100"
)}>
 <h3 className={cn("text-xs font-bold uppercase mb-2", offerMargin >= 35 ?"text-emerald-700" : offerMargin >= 20 ?"text-amber-700" :"text-rose-700")}>تأثير الخصم على الربح</h3>
 <div className={cn("text-xl md:text-3xl lg:text-xl md:text-2xl font-bold mb-2 tracking-tighter", offerMargin >= 35 ?"text-emerald-600" : offerMargin >= 20 ?"text-amber-600" :"text-rose-600")}>
 {Number(offerMargin || 0).toFixed(1)}%
 </div>
 <p className={cn("text-xs font-bold flex items-center gap-1", offerMargin >= 35 ?"text-emerald-600/70" : offerMargin >= 20 ?"text-amber-600/70" :"text-rose-600/70")}>
 قبل الخصم: {Number(originalMargin || 0).toFixed(1)}% <ArrowDownRight size={12} />
 </p>
 </div>

 <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
 <h3 className="text-indigo-700 text-xs font-bold uppercase mb-2">إجمالي التكلفة</h3>
 <div className="text-xl md:text-3xl lg:text-xl md:text-2xl font-bold text-indigo-600 mb-2 tracking-tighter">
 {Number(totalCost || 0).toFixed(3)}
 </div>
 <p className="text-indigo-600/70 text-xs font-bold">دينار كويتي</p>
 </div>

 {aiAnalysis && (
 <div className="col-span-2 bg-white border border-amber-200 shadow-lg shadow-amber-500/5 p-3 md:p-4 md:p-3 rounded-2xl relative">
 <div className="absolute top-4 left-4 p-2 bg-amber-50 rounded-full">
 <Sparkles className="text-amber-500" size={20} />
 </div>
 <h4 className="text-lg font-bold text-slate-800 mb-3">{aiAnalysis.title}</h4>
 <p className="text-slate-600 font-bold leading-relaxed text-sm md:text-base">
 {aiAnalysis.advice}
 </p>
 </div>
)}
 </motion.div>
 </AnimatePresence>
)}
 </div>
 </div>
 </div>
);
};
