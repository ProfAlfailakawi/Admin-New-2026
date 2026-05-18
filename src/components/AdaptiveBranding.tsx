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
  const [generatedTheme, setGeneratedTheme] = useState<{name: string, description: string, colors: string[], imageUrl?: string} | null>(null);
  
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('classic');
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

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
      
      const imgPrompt = `A beautiful, high-quality, abstract or atmospheric hero image for a website representing the theme: "${themeData.name}" (${themeData.description}). Use these colors prominently: ${themeData.colors.join(", ")}. Clean, modern Kuwaiti branding aesthetic. No text in the image.`;
      
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: '16:9' })
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

      setGeneratedTheme({ ...themeData, imageUrl: finalImg });
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mb-8">
        <button 
          disabled={isApplying}
          onClick={() => applyPresetTheme('morning')}
          className={`flex flex-col items-center justify-center p-10 rounded-3xl border-4 transition-all duration-500 group overflow-hidden relative ${activeTheme === 'morning' ? 'border-amber-400 bg-amber-50/50 shadow-lg shadow-amber-100' : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/10'}`}
        >
          {activeTheme === 'morning' && (
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-300 blur-3xl opacity-20 rounded-full" />
          )}
          <Sun className={`w-20 h-20 mb-6 transition-transform duration-700 ${activeTheme === 'morning' ? 'text-amber-500 scale-110' : 'text-slate-200 group-hover:scale-105 group-hover:text-amber-300'}`} />
          <h3 className={`text-2xl font-bold mb-2 ${activeTheme === 'morning' ? 'text-amber-800' : 'text-slate-600'}`}>هوية الصباح</h3>
          <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed">ألوان مشرقة، نشاط، تدعو لبدء اليوم بحيوية.</p>
          
          {activeTheme === 'morning' && <div className="mt-6 px-4 py-1.5 bg-amber-200 text-amber-800 font-bold rounded-full text-xs">مفعل حالياً</div>}
        </button>

        <button 
          disabled={isApplying}
          onClick={() => applyPresetTheme('night')}
          className={`flex flex-col items-center justify-center p-10 rounded-3xl border-4 transition-all duration-500 group overflow-hidden relative ${activeTheme === 'night' ? 'border-indigo-500 bg-slate-900 shadow-2xl shadow-indigo-900/50' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/10'}`}
        >
          {activeTheme === 'night' && (
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 blur-3xl opacity-30 rounded-full" />
          )}
          <Moon className={`w-20 h-20 mb-6 transition-transform duration-700 ${activeTheme === 'night' ? 'text-indigo-400 scale-110' : 'text-slate-200 group-hover:scale-105 group-hover:text-indigo-300'}`} />
          <h3 className={`text-2xl font-bold mb-2 ${activeTheme === 'night' ? 'text-white' : 'text-slate-600'}`}>هوية المساء</h3>
          <p className={`text-sm mt-2 text-center leading-relaxed ${activeTheme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>فخامة، أسود وذهبي، هدوء ورقي.</p>
          
          {activeTheme === 'night' && <div className="mt-6 px-4 py-1.5 bg-indigo-500 text-white font-bold rounded-full text-xs">مفعل حالياً</div>}
        </button>

      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-3xl p-6 md:p-8">
        <div className="flex justify-between items-start mb-2 gap-4">
           <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
             <Sparkles className="text-purple-600 w-5 h-5 shrink-0" />
             ابتكر ثيم خاص لمناسبة (AI Theme Generator)
           </h3>
           <div className="w-56 shrink-0 mt-1">
              <BrandingControls
                 useBranding={useBranding}
                 setUseBranding={setUseBranding}
                 brandingStyle={brandingStyle}
                 setBrandingStyle={setBrandingStyle}
                 logoPosition={logoPosition}
                 setLogoPosition={setLogoPosition}
                 logoOpacity={logoOpacity}
                 setLogoOpacity={setLogoOpacity}
                 colorClass="purple"
                 title="إضافة الهوية"
                 isCompact={true}
              />
           </div>
        </div>
        <p className="text-sm text-purple-700 mb-6 w-full max-w-xl">هل لديكم عرض للعيد الوطني؟ هل فاز المنتخب؟ اكتب المناسبة ودع الذكاء الاصطناعي يجهز لك ألوان وثيم خاص بمناسبتك.</p>
        
        <div className="flex flex-col md:flex-row gap-3 relative z-10">
          <input 
            type="text" 
            placeholder="مثال: احتفال العيد الوطني للكويت، أو يوم المرأة..."
            value={customThemeQuery}
            onChange={(e) => setCustomThemeQuery(e.target.value)}
            disabled={isApplying}
            onKeyDown={(e) => e.key === 'Enter' && generateCustomTheme()}
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-purple-200 focus:border-purple-500 outline-none font-medium"
          />
          <button 
            disabled={isApplying || !customThemeQuery}
            onClick={generateCustomTheme}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paintbrush className="w-5 h-5" />}
            توليد وتطبيق الثيم
          </button>
        </div>

        {generatedTheme && activeTheme === 'custom' && (
          <div className="mt-8 bg-white rounded-3xl shadow-sm border border-purple-100 block transition-all animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
            {generatedTheme.imageUrl && (
              <div className="w-full h-48 md:h-64 relative border-b border-purple-100">
                <img src={generatedTheme.imageUrl} alt={generatedTheme.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                   <h4 className="font-bold text-3xl text-white mb-1 drop-shadow-xl">{generatedTheme.name}</h4>
                </div>
              </div>
            )}
            
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    {!generatedTheme.imageUrl && <h4 className="font-bold text-xl text-slate-800 mb-1">{generatedTheme.name}</h4>}
                    <p className="text-slate-600 font-medium leading-relaxed max-w-2xl">{generatedTheme.description}</p>
                 </div>
                 <div className="px-4 py-2 bg-purple-100 text-purple-800 font-bold rounded-full text-xs shrink-0">مفعل حالياً</div>
              </div>
              
              <div className="mt-8">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">لوحة ألوان الثيم (Palette)</p>
                <div className="flex h-20 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                  {generatedTheme.colors.map((color, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-white/90 drop-shadow-md transition-transform hover:scale-110" style={{ backgroundColor: color }}>
                      <span className="bg-black/20 px-2 py-1 rounded backdrop-blur-sm">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
