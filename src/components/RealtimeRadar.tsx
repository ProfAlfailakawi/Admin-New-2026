import React, { useState } from 'react';
import { Zap, Loader2, Image as ImageIcon, Flame, Check, Copy, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { applyLogoBranding } from '../lib/brandingUtils';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { BrandingControls } from './BrandingControls';
import { loadStudioArchive, saveStudioArchive } from '../lib/studioArchive';

export const RealtimeRadar: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [customEvent, setCustomEvent] = useState('');
  const [generatedBaseImage, setGeneratedBaseImage] = useState<string | null>(null);
  
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.85);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [selectedFormat, setSelectedFormat] = useState('1:1');
  
  const [copying, setCopying] = useState(false);
  const [history, setHistory] = useState<{url: string, text: string, topic: string}[]>([]);

  React.useEffect(() => {
    let mounted = true;
    loadStudioArchive<{url: string, text: string, topic: string}>('realtime_radar_history', ['url']).then((items) => {
      if (mounted) setHistory(items);
    });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (history.length > 0) {
      saveStudioArchive('realtime_radar_history', history, ['url'], 10);
    }
  }, [history]);

  React.useEffect(() => {
    if (generatedBaseImage) {
      applyLogoBranding(
        generatedBaseImage,
        data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO,
        data.settings?.storeName || '',
        { useBranding, brandingStyle, logoOpacity, logoPosition, customText, textPosition }
      ).then(setResultImage);
    }
  }, [useBranding, brandingStyle, logoOpacity, logoPosition, customText, textPosition, generatedBaseImage]);

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
    setGeneratedBaseImage(null);
    try {
      const prompt = `أنت صانع محتوى كويتي ذكي (Real-time Marketer). الموضوع الحالي في الكويت هو: "${eventLabel}". اكتب بوست قصير (سطرين) يربط هذا الحدث بشكل إبداعي بـ مطعم أو كافيه (اختر شيء يناسب). اكتب العرض المناسب. استخدم لهجة كويتية.`;
      
      const txtRes = await fetch('/api/smart-studio/text-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const txtData = await txtRes.json();
      setResultText(txtData.text);

      const imgPrompt = `Generate a 10000% photorealistic, ultra-high quality, and hyper-realistic scene for a social media post related to this Kuwaiti trend/event: "${eventLabel}". The image must look like a real, high-end commercial photograph with realistic textures, lighting, and a real-world natural background. DO NOT USE ANY cartoonish or illustration styles. Clean composition, leaving space for UI. Warm, inviting atmosphere. Minimalist, creative lighting. IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO LOGOS, NO SIGNATURES, NO WATERMARKS ANYWHERE IN THE IMAGE. THE IMAGE MUST BE COMPLETELY TEXTLESS.`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: selectedFormat })
      });
      const imgData = await imgRes.json();
      
      if (imgData.imageUrl) {
        setGeneratedBaseImage(imgData.imageUrl);
        setHistory(prev => [{url: imgData.imageUrl, text: txtData.text, topic: eventLabel}, ...prev].slice(0, 10));
      }

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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 mt-6 shadow-sm flex flex-col-reverse lg:flex-row gap-8 items-start">
      <div className="w-full lg:w-[45%] flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Flame className="text-rose-500" />
            رادار التريندات الكويتي (Real-time)
          </h2>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl">واكب السوالف واللحظة! احصل على بوست وعرض وصورة بضغطة زر وتفاعل مع زبائنك في نفس الوقت وبابداع غير عادي يناسب السوق الكويتي.</p>

        {history.length > 0 && (
          <div className="bg-slate-50 rounded-3xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400">اضغط على أي عمل لاسترجاعه</span>
              <h3 className="font-black text-slate-800 flex items-center gap-2"><ImageIcon size={16} className="text-rose-500" /> أرشيف الصور السابقة</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {history.slice(0, 8).map((item, idx) => (
                <button key={idx} onClick={() => { setGeneratedBaseImage(item.url); setResultText(item.text); setTopic(item.topic); }} className="group rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all text-right">
                  {item.url ? (
                  <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center text-rose-400"><ImageIcon size={28} /></div>
                  )}
                  <div className="p-2 text-[10px] font-bold text-slate-500 truncate">{item.topic || 'عمل سابق'}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-3">
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => generateTrend(ev.id, ev.label)}
              disabled={loading}
              className="bg-slate-50 border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 px-4 py-3 rounded-2xl font-bold flex flex-col items-center gap-2 transition-all disabled:opacity-50 min-w-[120px] flex-1"
            >
              <span className="text-3xl mb-1">{ev.icon}</span>
              <span className="text-sm">{ev.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">اختر المقاس للتوليد</label>
          <div className="flex gap-2">
             {['1:1', '9:16', '4:3'].map(f => (
               <button key={f} onClick={() => setSelectedFormat(f)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedFormat === f ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                 {f === '1:1' ? 'Instagram' : f === '9:16' ? 'Story / TikTok' : 'إعلان 4:3'}
               </button>
             ))}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <BrandingControls
             useBranding={useBranding}
             setUseBranding={setUseBranding}
             brandingStyle={brandingStyle}
             setBrandingStyle={setBrandingStyle}
             logoPosition={logoPosition}
             setLogoPosition={setLogoPosition}
             logoOpacity={logoOpacity}
             setLogoOpacity={setLogoOpacity}
             customText={customText}
             setCustomText={setCustomText}
             textPosition={textPosition}
             setTextPosition={setTextPosition}
             colorClass="rose"
             title="4. هوية العلامة (Logo)"
          />
        </div>

        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="أو اكتب مناسبتك الخاصة هنا (مثال: يوم المرأة، فوز المنتخب)" 
            value={customEvent}
            onChange={(e) => setCustomEvent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && customEvent && generateTrend('custom', customEvent)}
            disabled={loading}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 focus:border-rose-400 outline-none font-medium text-right"
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

        {topic && !loading && resultText && (
          <div className="flex flex-col gap-4 mt-2 border-t border-slate-100 pt-6">
             <h3 className="text-rose-600 font-bold flex items-center gap-2">النص المقترح (مُصمم للتريند):</h3>
             <div className="bg-rose-50/50 p-5 rounded-2xl shadow-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed border border-rose-100/50 text-lg">
               {resultText}
             </div>
             <button onClick={handleCopy} className="flex items-center justify-center gap-2 bg-rose-600 text-white w-full py-4 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
               {copying ? <Check size={18} /> : <Copy size={18} />}
               {copying ? 'تم النسخ!' : 'نسخ النص'}
             </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="w-full mt-6 pt-4 border-t border-slate-100/50">
            <h4 className="text-[10px] font-black text-slate-400 mb-2 text-right uppercase tracking-widest">الأعمال الأخيرة</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {history.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => { setGeneratedBaseImage(item.url); setResultText(item.text); setTopic(item.topic); }}
                  className="w-16 h-16 rounded-xl border border-slate-200 flex-shrink-0 overflow-hidden"
                >
                  <img src={item.url} alt="hist" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[55%] sticky top-4 z-40 bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[250px] md:min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden">
         {!resultImage && !loading && (
            <div className="text-center p-6 w-full flex flex-col items-center opacity-50">
               <ImageIcon className="text-slate-300 w-24 h-24 mb-4" />
               <p className="font-bold text-slate-400">ستظهر صورة التريند هنا</p>
            </div>
         )}
         {loading && !resultImage && (
            <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-white/50 backdrop-blur-sm z-10">
               <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
            </div>
         )}
         {resultImage && (
            <div className="absolute inset-2 bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
              <img src={resultImage} alt={topic || 'trend'} className="w-full h-full object-contain" />
              <div className="absolute bottom-4 left-0 w-full px-4 text-center">
                 <a href={resultImage} download={`trend-${topic}.png`} className="inline-flex items-center justify-center gap-2 bg-white text-rose-600 border border-slate-200 py-3 px-6 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg max-w-sm">
                   <ImageIcon size={18} /> تحميل الصورة
                 </a>
              </div>
            </div>
         )}
      </div>
    </div>
  );
};
