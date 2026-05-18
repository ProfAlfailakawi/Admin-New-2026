import React, { useState } from 'react';
import { Clapperboard, Loader2, Star, Quote, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export const ReviewToPoster: React.FC<{ data: any; setData: any }> = ({ data, setData }) => {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState("شغلكم نار يا جماعة الطعم خيال خصوصا البرجر، مستحيل اطلب من غيركم 🍔🔥");
  const [resultImage, setResultImage] = useState<string | null>(null);

  const generatePoster = async () => {
    setLoading(true);
    setResultImage(null);
    try {
      const imgPrompt = `A cinematic, ultra-realistic movie poster style design for a restaurant social media post. The focal point is a mouth-watering cinematic burger (or relevant food). There must be dramatic lighting. Include glowing futuristic or cinematic aesthetic. Very high quality. Clean composition leaving middle center for text. Do NOT add any text to the image itself.`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, format: '4:3' })
      });
      const imgData = await imgRes.json();
      setResultImage(imgData.imageUrl);
    } catch (e) {
      toast.error("فشل التوليد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 mt-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Clapperboard className="text-purple-500" />
        مدح سينمائي (Review-to-Poster)
      </h2>
      <p className="text-slate-500 text-sm mb-6 max-w-2xl">لا تنزل سكرين شوت للتعليقات! حول مدح زباينك إلى بوستر سينمائي فخم يجبرهم على مشاركته مع أصدقائهم ليصبحوا أبطال قصتك.</p>
      
      <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <label className="block text-slate-700 font-bold mb-3">تعليق الزبون المكتوب:</label>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          className="w-full border shadow-sm border-slate-200 rounded-xl p-4 focus:border-purple-500 outline-none h-28 resize-none font-medium text-lg leading-relaxed text-slate-800 placeholder:text-slate-300 transition-colors bg-white shadow-inner"
        />
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={generatePoster}
            disabled={loading || !review}
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors w-full md:w-auto shadow-lg shadow-purple-200"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Star className="w-5 h-5" />}
            {loading ? "جاري الإنتاج السينمائي..." : "حول إلى بوستر سينمائي"}
          </button>
        </div>
      </div>

      {resultImage && (
        <div className="mt-8 bg-[#0a0a0a] p-4 md:p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl border border-purple-900/30">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none mix-blend-screen">
             <div className="w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
          </div>
          <div className="absolute bottom-0 left-0 p-8 opacity-20 pointer-events-none mix-blend-screen">
             <div className="w-64 h-64 bg-rose-500 rounded-full blur-[100px]" />
          </div>
          
          <Quote className="text-white/10 w-40 h-40 absolute -left-10 -top-10 rotate-12" />
          
          <div className="relative z-10 w-full max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group">
             <img src={resultImage} alt="Cinematic Review" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-1000" />
             
             {/* The Review Overlay to make it feel cinematic */}
             <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none flex items-end justify-center pb-12 px-6">
                <div className="text-center">
                  <div className="flex justify-center gap-1.5 mb-4 drop-shadow-2xl">
                    {[1,2,3,4,5].map(i => <Star key={i} className="text-amber-400 w-6 h-6 fill-amber-400" />)}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-serif" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    "{review}"
                  </h3>
                  <p className="text-purple-300 font-medium tracking-widest uppercase text-sm mt-4 opacity-80" style={{ letterSpacing: '4px' }}>A Masterpiece</p>
                </div>
             </div>
          </div>
          
          <div className="flex justify-center mt-6">
             <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3 rounded-xl font-bold backdrop-blur-md transition-all flex items-center gap-2">
                 <ImageIcon className="w-5 h-5" />
                 حفظ التصميم ونشره
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
