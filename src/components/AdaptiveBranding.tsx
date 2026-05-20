import React, { useState } from 'react';
import { Palette, Sun, Moon, Sparkles, Paintbrush, Loader2, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { applyLogoBranding } from '../lib/brandingUtils';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { BrandingControls } from './BrandingControls';

export const AdaptiveBranding: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const [activeTheme, setActiveTheme] = useState('morning');
  const [isApplying, setIsApplying] = useState(false);
  const [customThemeQuery, setCustomThemeQuery] = useState('');
  const [generatedTheme, setGeneratedTheme] = useState<{name: string, description: string, colors: string[], imageUrl?: string, baseImageUrl?: string} | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('16:9');
  
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('classic');
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [history, setHistory] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('adaptive_branding_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('adaptive_branding_history', JSON.stringify(history));
    }
  }, [history]);

  React.useEffect(() => {
    if (generatedTheme?.baseImageUrl) {
      applyLogoBranding(
        generatedTheme.baseImageUrl,
        data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO,
        data.settings?.storeName || '',
        { useBranding, brandingStyle, logoOpacity, logoPosition, customText, textPosition }
      ).then(brandedUrl => {
         setGeneratedTheme(prev => prev ? {...prev, imageUrl: brandedUrl} : null);
      });
    }
  }, [useBranding, brandingStyle, logoOpacity, logoPosition, customText, textPosition, generatedTheme?.baseImageUrl]);

  const applyPresetTheme = (theme: string) => {
    setIsApplying(true);
    setActiveTheme(theme);
    
    setTimeout(() => {
      setIsApplying(false);
      toast.success(`تم تغيير هوية التطبيق إلى: ${theme === 'morning' ? 'الصباح النشط ☀️' : 'المساء الفاخر 🌙'}`);
    }, 1500);
  };

  const generateCustomTheme = async () => {
    if (!customThemeQuery) return;
    setIsApplying(true);
    
    try {
      // Prompting AI to generate a theme conceptually based on the text
      const prompt = `You are an expert Kuwaiti brand designer. The user wants a custom theme for "${customThemeQuery}". 
Respond with a JSON object containing:
- name: string (A catchy short name for the theme in Arabic)
- description: string (A short Arabic description of the vibe and colors)
- colors: string[] (Array of 3 hex colors that represent this theme, from dark to light)
No markdown formatting, just pure JSON.`;
      
      const res = await fetch('/api/smart-studio/text-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!res.ok) throw new Error("API failed");
      
      const result = await res.json();
      const rawText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const themeData = JSON.parse(rawText);
      
      const imgPrompt = `Generate a 10000% photorealistic, highly realistic, real-world photograph for a hero image representing the theme: "${themeData.name}" (${themeData.description}). Use these colors prominently: ${themeData.colors.join(", ")}. Natural lighting, real textures, high-end photography aesthetic, NOT abstract art unless strictly necessary. Clean, modern Kuwaiti branding aesthetic. IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO SIGNATURES, NO LOGOS, NO WATERMARKS ANYWHERE IN THE IMAGE. THE IMAGE MUST BE COMPLETELY TEXTLESS.`;
      
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: selectedFormat })
      });
      const imgData = await imgRes.json();
      
      const newTheme = { ...themeData, baseImageUrl: imgData.imageUrl };
      setGeneratedTheme(newTheme);
      setHistory(prev => [newTheme, ...prev].slice(0, 10));
      setActiveTheme('custom');
      toast.success(`تم ابتكار وتطبيق ثيم: ${themeData.name} ✨`);
    } catch (e) {
      toast.error('لم نتمكن من توليد الثيم، تأكد من الاتصال أو مفتاح API.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 mt-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Palette className="text-blue-500" />
        الهوية المتغيرة (Adaptive Branding)
      </h2>
      <p className="text-slate-500 text-sm mb-8 max-w-xl">دع الذكاء الاصطناعي يغير ألوان ومزاج صفحتك أو متجرك بناءً على الوقت أو الموسم، أو ابتكر ثيماً جديداً لأي مناسبة تخطر ببالك!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative mb-8">
        <button 
          disabled={isApplying}
          onClick={() => applyPresetTheme('morning')}
          className={`flex items-center text-right p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 group overflow-hidden relative ${activeTheme === 'morning' ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50'}`}
        >
          {activeTheme === 'morning' && (
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-300 blur-3xl opacity-20 rounded-full" />
          )}
          <Sun className={`w-12 h-12 ml-4 shrink-0 transition-transform duration-700 ${activeTheme === 'morning' ? 'text-amber-500 scale-110' : 'text-slate-300 group-hover:scale-105 group-hover:text-amber-400'}`} />
          <div className="flex-1">
             <div className="flex justify-between items-center mb-1">
                <h3 className={`text-lg font-bold ${activeTheme === 'morning' ? 'text-amber-800' : 'text-slate-600'}`}>هوية الصباح</h3>
                {activeTheme === 'morning' && <div className="px-3 py-1 bg-amber-200 text-amber-800 font-bold rounded-full text-[10px]">مفعل</div>}
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">ألوان مشرقة، نشاط، تدعو لبدء اليوم بحيوية.</p>
          </div>
        </button>

        <button 
          disabled={isApplying}
          onClick={() => applyPresetTheme('night')}
          className={`flex items-center text-right p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 group overflow-hidden relative ${activeTheme === 'night' ? 'border-indigo-400 bg-slate-900 shadow-xl shadow-indigo-900/40' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'}`}
        >
          {activeTheme === 'night' && (
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 blur-3xl opacity-20 rounded-full" />
          )}
          <Moon className={`w-12 h-12 ml-4 shrink-0 transition-transform duration-700 ${activeTheme === 'night' ? 'text-indigo-400 scale-110' : 'text-slate-300 group-hover:scale-105 group-hover:text-indigo-400'}`} />
          <div className="flex-1">
             <div className="flex justify-between items-center mb-1">
               <h3 className={`text-lg font-bold ${activeTheme === 'night' ? 'text-white' : 'text-slate-600'}`}>هوية المساء</h3>
               {activeTheme === 'night' && <div className="px-3 py-1 bg-indigo-500 text-white font-bold rounded-full text-[10px]">مفعل</div>}
             </div>
             <p className={`text-xs leading-relaxed ${activeTheme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>فخامة، أسود وذهبي، هدوء ورقي.</p>
          </div>
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-3xl p-6 md:p-8 flex flex-col-reverse lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-[45%] flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
             <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
               <Sparkles className="text-purple-600 w-5 h-5 shrink-0" />
               ابتكر ثيم خاص لمناسبة (AI Theme Generator)
             </h3>
          </div>
          <p className="text-sm text-purple-700 w-full max-w-xl">هل لديكم عرض للعيد الوطني؟ هل فاز المنتخب؟ اكتب المناسبة ودع الذكاء الاصطناعي يجهز لك ألوان وثيم خاص بمناسبتك.</p>
          
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">اختر المقاس لصورة الهيرو</label>
            <div className="flex gap-2">
               {['16:9', '1:1', '9:16', '4:3'].map(f => (
                 <button key={f} onClick={() => setSelectedFormat(f)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedFormat === f ? 'bg-purple-100 border-purple-500 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                   {f === '16:9' ? 'موقع إلكتروني (عريض)' : f === '1:1' ? 'Instagram' : f === '9:16' ? 'Story / TikTok' : 'إعلان 4:3'}
                 </button>
               ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
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

          <div className="flex flex-col gap-3 relative z-10 w-full">
            <input 
              type="text" 
              placeholder="مثال: احتفال العيد الوطني للكويت، أو يوم المرأة..."
              value={customThemeQuery}
              onChange={(e) => setCustomThemeQuery(e.target.value)}
              disabled={isApplying}
              onKeyDown={(e) => e.key === 'Enter' && generateCustomTheme()}
              className="w-full px-4 py-3 rounded-2xl border-2 border-purple-200 focus:border-purple-500 outline-none font-medium text-right"
            />
            <button 
              disabled={isApplying || !customThemeQuery}
              onClick={generateCustomTheme}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full"
            >
              {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paintbrush className="w-5 h-5" />}
              توليد وتطبيق الثيم
            </button>
          </div>
        </div>

        <div className="w-full lg:w-[55%] sticky top-4 z-40 min-h-[300px] md:min-h-[500px]">
          {(!generatedTheme || activeTheme !== 'custom') && !isApplying && (
             <div className="w-full h-full min-h-[300px] md:min-h-[500px] border-2 border-dashed border-purple-200 rounded-3xl flex flex-col items-center justify-center text-purple-300 gap-4 bg-white/50">
                <Paintbrush className="w-16 h-16 opacity-50" />
                <p className="font-bold">سيظهر الثيم المبتكر هنا</p>
             </div>
          )}

          {isApplying && (
             <div className="w-full h-full min-h-[300px] md:min-h-[500px] border-2 border-purple-200 rounded-3xl flex flex-col items-center justify-center text-purple-600 gap-4 bg-white/50 shadow-inner">
                <Loader2 className="w-16 h-16 animate-spin" />
                <p className="font-bold">جاري التصميم والابتكار...</p>
             </div>
          )}

          {generatedTheme && activeTheme === 'custom' && !isApplying && (
            <div className="bg-white rounded-3xl shadow-sm border border-purple-100 block transition-all animate-in fade-in slide-in-from-bottom-4 overflow-hidden h-fit">
              {generatedTheme.imageUrl && (
                <div className="w-full h-48 md:h-64 relative border-b border-purple-100">
                  <img src={generatedTheme.imageUrl} alt={generatedTheme.name} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                     <h4 className="font-bold text-3xl text-white mb-1 drop-shadow-xl">{generatedTheme.name}</h4>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col p-6 gap-4">
                <div className="flex justify-between items-start">
                   <div>
                      {!generatedTheme.imageUrl && <h4 className="font-bold text-xl text-slate-800 mb-1">{generatedTheme.name}</h4>}
                      <p className="text-slate-600 font-medium leading-relaxed max-w-full text-sm">{generatedTheme.description}</p>
                   </div>
                   <div className="px-3 py-1.5 bg-purple-100 text-purple-800 font-bold rounded-full text-xs shrink-0">مفعل حالياً</div>
                </div>
                
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">لوحة ألوان الثيم (Palette)</p>
                  <div className="flex h-16 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                    {generatedTheme.colors.map((color, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-white/90 drop-shadow-md transition-transform hover:scale-110" style={{ backgroundColor: color }}>
                        <span className="bg-black/20 px-2 py-1 rounded backdrop-blur-sm">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {generatedTheme.imageUrl && (
                  <div className="mt-4">
                     <a href={generatedTheme.imageUrl} download={`theme-${generatedTheme.name}.png`} className="flex bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all items-center justify-center gap-2 w-full">
                       <Paintbrush size={18} /> حفظ صورة الثيم
                     </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Palette size={18} className="text-purple-600" />
                  أرشيف الثيمات السابقة
                </h3>
                <span className="text-[10px] font-bold text-slate-400">اضغط على أي عنصر لاستعادته</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {history.slice(0, 8).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setGeneratedTheme(item); setActiveTheme('custom'); }}
                    className="group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right"
                  >
                    {item.imageUrl || item.baseImageUrl ? (
                      <img
                        src={item.imageUrl || item.baseImageUrl}
                        alt={item.name}
                        className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div
                        className="w-full aspect-square"
                        style={{ background: `linear-gradient(135deg, ${item.colors?.[0]}, ${item.colors?.[1]})` }}
                      />
                    )}
                    <div className="p-2 text-[10px] font-bold text-slate-500 truncate">
                      {item.name || (item.description ? String(item.description).slice(0, 20) : 'ثيم سابق')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
