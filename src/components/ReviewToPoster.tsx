import React, { useState } from 'react';
import { Clapperboard, Loader2, Star, Quote, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { applyLogoBranding } from '../lib/brandingUtils';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { BrandingControls } from './BrandingControls';
import { loadStudioArchive, saveStudioArchive } from '../lib/studioArchive';
import { buildTextRealityPrompt } from '../lib/studioReality';
import { buildStudioTastePrompt, recordStudioTasteChoice } from '../lib/studioLearning';

export const ReviewToPoster: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState("شغلكم نار يا جماعة الطعم خيال خصوصا المجبوس، مستحيل اطلب من غيركم 🥘🔥");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generatedBaseImage, setGeneratedBaseImage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('4:3');
  
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.9);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [history, setHistory] = useState<{url: string, review: string}[]>([]);

  React.useEffect(() => {
    let mounted = true;
    loadStudioArchive<{url: string, review: string}>('review_to_poster_history', ['url']).then((items) => {
      if (mounted) setHistory(items);
    });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (history.length > 0) {
      saveStudioArchive('review_to_poster_history', history, ['url'], 10);
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

  const generatePoster = async () => {
    setLoading(true);
    setResultImage(null);
    setGeneratedBaseImage(null);
    try {
      const imgPrompt = buildTextRealityPrompt('Review-to-poster real Kuwaiti home-order hero image', review, 'Represent the food/service mentioned in the review as a believable photographed Kuwaiti order moment. Use realistic home table, diwaniya, delivery packaging, chalet, or prep counter context. Make it feel like a real customer or photographer in Kuwait actually captured it. Do not imply a dine-in restaurant.');
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: selectedFormat, realityBoost: true, tasteProfile: buildStudioTastePrompt() })
      });
      const imgData = await imgRes.json();
      
      if (imgData.imageUrl) {
        setGeneratedBaseImage(imgData.imageUrl);
        setHistory(prev => [{url: imgData.imageUrl, review}, ...prev].slice(0, 10));
        recordStudioTasteChoice({ theme: review.slice(0, 60), format: selectedFormat, label: 'مدح سينمائي', source: 'review-tab' });
      }
    } catch (e) {
      toast.error("التوليد ما ضبط");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 mt-6 shadow-sm flex flex-col-reverse lg:flex-row gap-8 items-start">
      <div className="w-full lg:w-[45%] flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clapperboard className="text-purple-500" />
            مدح العملاء
          </h2>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl">حوّل مدح الزبائن إلى بوستر واقعي كأنه مصور لطلب كويتي واصل للبيت أو الديوانية: خلفية بشرية، إضاءة حقيقية، وبدون أي ديكور وهمي أو شكل CGI.</p>
        
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">اختر المقاس للتوليد</label>
          <div className="flex gap-2">
             {['1:1', '9:16', '4:3'].map(f => (
               <button key={f} onClick={() => setSelectedFormat(f)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedFormat === f ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                 {f === '1:1' ? 'Instagram' : f === '9:16' ? 'Story / TikTok' : 'بوستر أطول 4:3'}
               </button>
             ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
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
             colorClass="purple"
             title="4. هوية العلامة (Logo)"
          />
        </div>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-slate-700 font-bold mb-3">تعليق الزبون المكتوب:</label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            className="w-full border shadow-sm border-slate-200 rounded-xl p-4 focus:border-purple-500 outline-none h-28 resize-none font-medium text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 transition-colors bg-white shadow-inner text-right"
          />
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={generatePoster}
              disabled={loading || !review}
              className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors w-full md:w-auto shadow-lg shadow-purple-200"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Star className="w-5 h-5" />}
              {loading ? "ننتج البوستر..." : "حوّل إلى بوستر كويتي"}
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <ImageIcon size={18} className="text-purple-600" />
                أرشيف البوسترات السابقة
              </h3>
              <span className="text-[10px] font-bold text-slate-400">اضغط على أي بوستر لاستعادته</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {history.slice(0, 8).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { if (item.url) setGeneratedBaseImage(item.url); setReview(item.review); }}
                  className="group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt="hist"
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-50 to-fuchsia-50 flex items-center justify-center text-purple-400"><ImageIcon size={28} /></div>
                  )}
                  <div className="p-2 text-[10px] font-bold text-slate-500 truncate">
                    {item.review ? item.review.slice(0, 20) : 'بوستر سابق'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="w-full lg:w-[55%] sticky top-4 z-40 bg-[#0a0a0a] rounded-3xl text-center relative overflow-hidden shadow-2xl border border-purple-900/30 min-h-[500px] flex items-center justify-center">
        {!resultImage && !loading && (
          <div className="text-center p-6 w-full flex flex-col items-center opacity-30">
            <Clapperboard className="text-white w-24 h-24 mb-4" />
            <p className="font-bold text-slate-300">سيتم عرض البوستر هنا</p>
          </div>
        )}

        {loading && (
          <div className="text-center p-6 w-full flex flex-col items-center z-20">
            <Loader2 className="text-purple-400 w-12 h-12 mb-4 animate-spin" />
            <p className="font-bold text-white">نحلل التعليق ونصمم البوستر...</p>
          </div>
        )}

        {resultImage && (
          <div className="w-full h-full p-4 md:p-8 flex items-center justify-center relative">
            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none mix-blend-screen z-0">
               <div className="w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
            </div>
            <div className="absolute bottom-0 left-0 p-8 opacity-20 pointer-events-none mix-blend-screen z-0">
               <div className="w-64 h-64 bg-rose-500 rounded-full blur-[100px]" />
            </div>
            
            <Quote className="text-white/10 w-40 h-40 absolute left-4 top-4 rotate-12 z-0 pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group flex flex-col">
               <div className="relative w-full">
                  <img src={resultImage} alt="Cinematic Review" className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-1000" />
                  
                  <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none flex items-end justify-center pb-8 px-4">
                    <div className="text-center">
                      <div className="flex justify-center gap-1 mb-2 drop-shadow-2xl">
                        {[1,2,3,4,5].map(i => <Star key={i} className="text-amber-400 w-5 h-5 fill-amber-400" />)}
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-serif leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                        "{review}"
                      </h3>
                      <p className="text-purple-300 font-medium tracking-widest uppercase text-xs mt-2 opacity-80" style={{ letterSpacing: '4px' }}>A Masterpiece</p>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-fit whitespace-nowrap">
               <a href={resultImage} download="cinematic-review.png" className="bg-black/50 hover:bg-black/80 text-white border border-white/20 px-6 py-2.5 rounded-full font-bold backdrop-blur-md transition-all flex items-center gap-2 text-sm">
                   <ImageIcon className="w-4 h-4" />
                   حفظ البوستر
               </a>
            </div>
          </div>
        )}

        {/* History overlay removed in favor of unified archive card */}
      </div>
    </div>
  );
};
