import React, { useState } from 'react';
import { Zap, Loader2, Image as ImageIcon, Flame, Check, Copy, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { applyLogoBranding } from '../lib/brandingUtils';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { BrandingControls } from './BrandingControls';

export const RealtimeRadar: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [customEvent, setCustomEvent] = useState('');
  
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.85);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  
  const [copying, setCopying] = useState(false);

  const events = [
    { id: 'rain', label: 'مطر بالكويت', icon: '🌧️', msg: 'جو المطر يبي له...' },
    { id: 'traffic', label: 'زحمة بالشوارع', icon: '🚗', msg: 'زحمة خط الملك فهد...' },
    { id: 'national', label: 'العيد الوطني/فرحة', icon: '🇰🇼', msg: 'فرحة كويتية...' },
    { id: 'sports', label: 'فوز المنتخب/نادي', icon: '⚽', msg: 'فوز مستحق...' },
    { id: 'weekend', label: 'خميس وويكند', icon: '🎉', msg: 'الويكند وصل...' },
  ];

  const generateTrend = async (eventId: string, eventLabel: string) => {
    setLoading(true);
    setTopic(eventLabel);
    setResultText(null);
    setResultImage(null);
    try {
      const prompt = `أنت صانع محتوى كويتي ذكي (Real-time Marketer). الموضوع الحالي في الكويت هو: "${eventLabel}". اكتب بوست قصير (سطرين) يربط هذا الحدث بشكل إبداعي بـ مطعم أو كافيه (اختر شيء يناسب). اكتب العرض المناسب. استخدم لهجة كويتية.`;
      
      const txtRes = await fetch('/api/smart-studio/text-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const txtData = await txtRes.json();
      setResultText(txtData.text);

      const imgPrompt = `A stylized, high quality, ultra-realistic social media post image for a modern trendy Kuwaiti brand. Theme: ${eventLabel}. Clean composition, leaving space for UI/text. Warm, inviting atmosphere. Minimalist, creative lighting. NO TEXT in the image.`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: '1:1' })
      });
      const imgData = await imgRes.json();
      
      let finalImg = imgData.imageUrl;
      if (useBranding && finalImg) {
        finalImg = await applyLogoBranding(
          finalImg,
          data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO,
          data.settings?.storeName || '',
          { useBranding, brandingStyle, logoOpacity, logoPosition }
        );
      }
      setResultImage(finalImg);

    } catch (e) {
      toast.error("فشل التوليد الذكي");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopying(true);
      toast.success('تم نسخ النص بنجاح!');
      setTimeout(() => setCopying(false), 2000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 mt-6 shadow-sm">
      <div className="flex justify-between items-start mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Flame className="text-rose-500" />
          رادار التريندات الكويتي (Real-time)
        </h2>
        <div className="w-56 mt-1">
          <BrandingControls
             useBranding={useBranding}
             setUseBranding={setUseBranding}
             brandingStyle={brandingStyle}
             setBrandingStyle={setBrandingStyle}
             logoPosition={logoPosition}
             setLogoPosition={setLogoPosition}
             logoOpacity={logoOpacity}
             setLogoOpacity={setLogoOpacity}
             colorClass="rose"
             title="إضافة الهوية"
             isCompact={true}
          />
        </div>
      </div>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">واكب السوالف واللحظة! احصل على بوست وعرض وصورة بضغطة زر وتفاعل مع زبائنك في نفس الوقت وبابداع غير عادي يناسب السوق الكويتي.</p>
      
      <div className="flex flex-wrap gap-3 mb-6">
        {events.map(ev => (
          <button
            key={ev.id}
            onClick={() => generateTrend(ev.id, ev.label)}
            disabled={loading}
            className="bg-slate-50 border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 px-4 py-3 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all disabled:opacity-50 min-w-[120px]"
          >
            <span className="text-3xl mb-1">{ev.icon}</span>
            <span className="text-sm">{ev.label}</span>
          </button>
        ))}
      </div>

      <div className="mb-8 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col md:flex-row gap-3">
        <input 
          type="text" 
          placeholder="أو اكتب مناسبتك الخاصة هنا (مثال: يوم المرأة، فوز المنتخب، غبار...)" 
          value={customEvent}
          onChange={(e) => setCustomEvent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && customEvent && generateTrend('custom', customEvent)}
          disabled={loading}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 focus:border-rose-400 outline-none font-medium"
        />
        <button 
          onClick={() => generateTrend('custom', customEvent)}
          disabled={loading || !customEvent}
          className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Flame className="w-5 h-5 text-rose-500" />
          توليد فكرة للمناسبة
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
          <p className="text-slate-500 font-bold">جاري تحليل التريند وتجهيز المحتوى الصاروخي...</p>
        </div>
      )}

      {topic && !loading && (resultText || resultImage) && (
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-rose-100 flex flex-col md:flex-row gap-6 items-start">
          {resultImage ? (
            <div className="w-full md:w-1/2 rounded-2xl overflow-hidden border shadow-lg bg-white relative group">
               <img src={resultImage} alt={topic} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
          ) : (
            <div className="w-full md:w-1/2 h-64 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
              <ImageIcon className="text-slate-300 w-12 h-12" />
            </div>
          )}
          <div className="w-full md:w-1/2">
             <h3 className="text-rose-600 font-bold mb-3 flex items-center gap-2">النص المقترح (مُصمم للتريند):</h3>
             <div className="bg-white p-5 rounded-2xl shadow-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed border border-rose-100 text-lg relative">
               {resultText}
             </div>
             <button onClick={handleCopy} className="mt-6 flex items-center justify-center gap-2 bg-rose-600 text-white w-full py-4 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
               {copying ? <Check size={18} /> : <Copy size={18} />}
               {copying ? 'تم النسخ!' : 'نسخ وجدولة النشر الآن'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
