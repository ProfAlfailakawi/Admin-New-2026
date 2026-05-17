import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Download, Check, Save, Upload, X, Loader2, MousePointerSquareDashed } from 'lucide-react';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SmartContentStudioProps {
  data: any;
  setData: (data: any) => void;
  onNavigate: (page: string) => void;
}

export const SmartContentStudio: React.FC<SmartContentStudioProps> = ({ data, setData, onNavigate }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('1:1');
  const [selectedTheme, setSelectedTheme] = useState('تراثي');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formats = [
    { id: '1:1', label: 'Instagram Post', sub: '1:1', icon: <ImageIcon size={16} /> },
    { id: '9:16', label: 'Story / TikTok', sub: '9:16', icon: <ImageIcon size={16} className="h-5" /> },
    { id: '4:3', label: 'إعلان بسيط', sub: '4:3', icon: <ImageIcon size={16} className="w-5" /> }
  ];

  const themes = [
    { id: 'تراثي', label: 'ثيم تراثي كويتي', desc: 'خلفية تراثية، سفرة عائلية دافئة' },
    { id: 'فاخر', label: 'ثيم مطعم فاخر', desc: 'إضاءة سينمائية، خلفية داكنة راقية' },
    { id: 'بسيط', label: 'لقطة مقربة بسيطة', desc: 'خلفية نظيفة، تركيز على الطبق' },
    { id: 'رمضان', label: 'ثيم رمضاني', desc: 'فوانيس، إضاءة ناعمة، ضيافة خليجية' },
    { id: 'تنظيف', label: 'تحسين واقعي فقط', desc: 'نفس المشهد مع تحسين الإضاءة والألوان' }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setOriginalImage(event.target?.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateContent = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    // Call backend API to process the realistic AI image
    try {
      const response = await fetch('/api/smart-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: selectedImage.split(',')[1],
          format: selectedFormat,
          theme: selectedTheme
        })
      });

      if (!response.ok) {
        throw new Error('فشل توليد الصورة');
      }

      const resData = await response.json();
      if (resData.imageUrl) {
        setGeneratedImage(resData.imageUrl);
      } else {
        alert("حدث خطأ أثناء الإنشاء");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الإنشاء. تأكد من إعدادات المفتاح وللاتصال بالإنترنت.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `social-media-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const handleSaveToProduct = async () => {
    if (!generatedImage || !selectedProductId) return;
    setIsSaving(true);
    try {
      const product = data.products.find((p: Product) => p.id === selectedProductId);
      if (product) {
        // Here we could ideally upload the base64 to Firebase Storage. 
        // For simplicity the user would typically update standard metadata, but since it's a social asset:
        const updatedProducts = data.products.map((p: Product) => {
          if (p.id === selectedProductId) {
            const mktg = (p as any).marketingImages || [];
            return {
              ...p,
              marketingImages: [...mktg, generatedImage]
            };
          }
          return p;
        });
        await setData({ ...data, products: updatedProducts });
        alert('تم حفظ الصورة ضمن الأصول التسويقية للمنتج بنجاح!');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl shadow-xl border border-indigo-700/50 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Camera className="w-8 h-8 text-indigo-300" />
              استوديو المحتوى الذكي
            </h1>
            <p className="text-indigo-200 mt-2 max-w-xl text-sm leading-relaxed">
              ارفع صورة منتجاتك الحقيقية، وسنحولها إلى صور تسويقية احترافية للسوشيال ميديا مع الحفاظ الكامل على واقعية وشكل الطبق الأصلي دون أي تزييف.
            </p>
          </div>
          {originalImage && (
            <button 
              onClick={() => { setSelectedImage(null); setOriginalImage(null); setGeneratedImage(null); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all text-sm font-bold flex items-center gap-2"
            >
              <Upload size={16} /> رفع صورة أخرى
            </button>
          )}
        </div>
      </div>

      {!originalImage ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full mt-10 h-80 border-4 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all group"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 shadow-sm transition-transform">
            <Camera className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">اضغط لرفع صورة الطبق</h3>
          <p className="text-slate-500 text-sm">JPG, PNG (جودة عالية مفضلة)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <MousePointerSquareDashed size={16} className="text-indigo-600" />
                1. اختر المقاس والتنسيق
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {formats.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormat(f.id)}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                      selectedFormat === f.id ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {f.icon}
                    <div className="text-center">
                      <div className="text-xs font-bold">{f.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{f.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600" />
                2. اختر الثيم (خلفية المشهد)
              </h3>
              <div className="space-y-3">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-right flex flex-col gap-1 transition-all",
                      selectedTheme === t.id ? "bg-purple-50 border-purple-500 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("text-sm font-bold", selectedTheme === t.id ? "text-purple-800" : "text-slate-800")}>{t.label}</div>
                    <div className="text-xs text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                <b className="block mb-1">💡 قاعدة حماية الهوية:</b>
                النظام مصمم ليغير فقط الإضاءة، المشهد الخلفي، واقتصاص الصورة بدون المساس أو تغيير شكل ومكونات الطبق الأصلي نهائياً.
              </p>
            </div>

            <button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري تصميم الصورة...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  انشئ المشهد
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden">
              
              {!generatedImage && !isGenerating && (
                <div className="text-center w-full max-w-sm mx-auto p-4">
                  <div className="w-full aspect-square bg-white rounded-2xl border shadow-sm p-2 mb-4 relative">
                    <img src={originalImage} alt="Original" className="w-full h-full object-contain rounded-xl" />
                    <div className="absolute top-4 left-4 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-md">
                      الصورة الأصلية 
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">حدد الخيارات واضغط "انشئ المشهد" لنبدأ العمل.</p>
                </div>
              )}

              {isGenerating && (
                <div className="text-center px-6">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6 shadow-indigo-200 shadow-xl relative animate-pulse">
                     <Sparkles className="w-8 h-8 text-indigo-600 absolute animate-ping opacity-50" />
                     <Sparkles className="w-10 h-10 text-indigo-600 relative z-10" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">جاري العمل كمدير تسويق ذكي...</h3>
                  <div className="text-sm text-slate-500 space-y-1">
                    <p>✨ تحليل الصورة وفهم عمق الطبق</p>
                    <p>✨ بناء مسرح تصوير واقعي ({selectedTheme})</p>
                    <p>✨ تحسين الإضاءة التسويقية</p>
                  </div>
                </div>
              )}

              {generatedImage && !isGenerating && (
                <div className="w-full h-full flex flex-col md:flex-row gap-6 p-4">
                  
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 mb-3 text-center">الصورة قبل</p>
                    <div className="w-full max-w-[200px] aspect-square bg-white rounded-2xl border shadow-sm p-1 inline-block">
                      <img src={originalImage} alt="Original" className="w-full h-full object-cover rounded-xl" />
                    </div>
                  </div>

                  <div className="flex-[3] flex flex-col">
                    <p className="text-sm font-bold text-indigo-600 mb-3 text-center">الصورة بعد التصميم (جاهزة للنشر)</p>
                    <div className="flex-1 bg-white rounded-2xl border shadow-sm p-2 relative flex items-center justify-center min-h-[400px]">
                      <img src={generatedImage} alt="Generated" className={cn(
                        "rounded-xl max-h-[600px] object-contain shadow-sm",
                        selectedFormat === '9:16' ? "aspect-[9/16]" : 
                        selectedFormat === '4:3' ? "aspect-video" : "aspect-square"
                      )} />
                    </div>
                    
                    <div className="flex gap-3 mt-6 justify-center">
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
                      >
                        <Download size={18} /> تحميل الصورة
                      </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 w-full flex flex-col items-center gap-3">
                      <p className="text-xs font-bold text-slate-500">أو حفظ الصورة في حساب المنتج (كأصول تسويقية)</p>
                      <div className="flex gap-2 w-full max-w-sm">
                        <select 
                          className="flex-1 p-3 border rounded-xl bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 outline-none"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                          <option value="">-- اختر المنتج --</option>
                          {data?.products?.map((p: Product) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveToProduct}
                          disabled={!selectedProductId || isSaving}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          حفظ
                        </button>
                      </div>
                    </div>
                  </div>
                  
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
};
