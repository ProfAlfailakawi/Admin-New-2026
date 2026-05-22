import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Crown, Medal, Swords, Target, Settings, Flame, Star, ExternalLink, MessageCircle, X, Plus, Trash2, Edit2, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { DEFAULT_SQUADS } from '../data';

export const DiwaniyaTournaments: React.FC<{ data: any; setData: any, onNavigate?: (page: string) => void }> = ({ data, setData, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'squads' | 'settings'>('leaderboard');
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Use global squads if available, otherwise fallback to initial ones
  const squads = Array.isArray(data.squads) ? data.squads : DEFAULT_SQUADS;

  const setSquads = (newSquads: any[]) => {
    setData((prev: any) => ({ ...prev, squads: newSquads }));
  };

  React.useEffect(() => {
    if (!data.squads) {
      setSquads(squads);
    }
  }, []);

  const DEFAULT_TIERS = [
    { id: 1, name: 'شلة ديوانية', points: '0', label: 'بداية التجمع', color: 'from-orange-400 to-orange-600', bgClass: 'border-orange-200 bg-orange-50/50', iconType: 'Medal' },
    { id: 2, name: 'عزوة', points: '5,000', label: 'خصم 10% ثابت', color: 'from-slate-300 to-slate-500', bgClass: 'border-slate-300 bg-slate-50/50', iconType: 'Star' },
    { id: 3, name: 'نواخذة', points: '10,000', label: 'مقبلات مجانية مع طلبات الشلة', color: 'from-yellow-400 to-amber-600', bgClass: 'border-amber-300 bg-amber-50', iconType: 'Crown' },
    { id: 4, name: 'شيوخ', points: '15,000', label: 'صينية ضيافة مجانية كل 10 طلبات', color: 'from-purple-500 to-fuchsia-700', bgClass: 'border-purple-300 bg-purple-50 shadow-lg', iconType: 'Trophy' },
  ];

  const parseTierPoints = (value: any) => Number(String(value || '0').replace(/,/g, '')) || 0;

  const normalizeAdminTier = (tier: any, index = 0) => {
    const fallback = DEFAULT_TIERS[index] || DEFAULT_TIERS[DEFAULT_TIERS.length - 1];
    const minPoints = tier?.minPoints ?? tier?.points ?? tier?.requiredPoints ?? fallback.points;
    const iconType = tier?.iconType || (typeof tier?.icon === 'string' && !tier.icon.startsWith('http') ? tier.icon : fallback.iconType);
    return {
      id: tier?.id ?? fallback.id ?? Date.now() + index,
      name: tier?.name ?? fallback.name,
      points: String(minPoints ?? '0'),
      label: tier?.label ?? tier?.benefit ?? fallback.label,
      color: tier?.gradient ?? tier?.colorGradient ?? (String(tier?.color || '').startsWith('from-') ? tier.color : fallback.color),
      bgClass: tier?.bgClass ?? tier?.bg ?? fallback.bgClass,
      iconType,
      imageUrl: tier?.imageUrl || tier?.image || '',
    };
  };

  const normalizeForOrder = (list: any[]) => {
    const sorted = [...list].map(normalizeAdminTier).sort((a, b) => parseTierPoints(a.points) - parseTierPoints(b.points));
    const readableThemes = [
      { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
      { color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
      { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
      { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
      { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    ];
    return sorted.map((tier, index) => {
      const theme = readableThemes[index % readableThemes.length];
      return {
        id: String(tier.id),
        name: tier.name,
        minPoints: parseTierPoints(tier.points),
        maxPoints: index < sorted.length - 1 ? Math.max(parseTierPoints(sorted[index + 1].points) - 1, parseTierPoints(tier.points)) : 999999999,
        color: theme.color,
        bg: theme.bg,
        border: theme.border,
        gradient: tier.color,
        colorGradient: tier.color,
        bgClass: tier.bgClass,
        iconType: tier.iconType,
        icon: tier.iconType === 'Trophy' ? '🏆' : tier.iconType === 'Crown' ? '👑' : tier.iconType === 'Star' ? '⭐' : tier.iconType === 'Medal' ? '🏅' : '🎯',
        benefit: tier.label,
        label: tier.label,
        imageUrl: tier.imageUrl || undefined,
      };
    });
  };

  const [tiers, setLocalTiers] = useState(() => {
    const saved = Array.isArray(data?.diwaniyaTiers) ? data.diwaniyaTiers : Array.isArray(data?.squadTiers) ? data.squadTiers : DEFAULT_TIERS;
    return saved.map(normalizeAdminTier);
  });

  const setTiers = (next: any[] | ((prev: any[]) => any[])) => {
    setLocalTiers((prev) => {
      const resolved = typeof next === 'function' ? (next as any)(prev) : next;
      const normalized = resolved.map(normalizeAdminTier);
      const sharedTiers = normalizeForOrder(normalized);

      // Persist through the shared AppState using a functional update.
      // This prevents newly added levels from being overwritten by a stale
      // `data` object when the screen is closed, reopened, or after logout/login.
      setData((current: any) => ({
        ...current,
        diwaniyaTiers: normalized,
        squadTiers: sharedTiers,
      }));

      try {
        const raw = localStorage.getItem('ktk_accounting_data');
        if (raw) {
          const stored = JSON.parse(raw);
          localStorage.setItem('ktk_accounting_data', JSON.stringify({
            ...stored,
            diwaniyaTiers: normalized,
            squadTiers: sharedTiers,
          }));
        }
      } catch {}

      return normalized;
    });
  };

  useEffect(() => {
    const savedAdminTiers = Array.isArray(data?.diwaniyaTiers) ? data.diwaniyaTiers : null;
    const savedSharedTiers = Array.isArray(data?.squadTiers) ? data.squadTiers : null;
    if (savedAdminTiers?.length) {
      setLocalTiers(savedAdminTiers.map(normalizeAdminTier));
      return;
    }
    if (savedSharedTiers?.length) {
      const fromShared = savedSharedTiers.map((tier: any, index: number) => normalizeAdminTier({
        id: tier.id ?? index + 1,
        name: tier.name,
        points: tier.minPoints ?? tier.points ?? 0,
        label: tier.benefit ?? tier.label,
        imageUrl: tier.imageUrl,
      }, index));
      setLocalTiers(fromShared);
      return;
    }
    setData((current: any) => ({ ...current, diwaniyaTiers: tiers, squadTiers: normalizeForOrder(tiers) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTierForPoints = (points: any) => {
    const sorted = [...tiers].sort((a, b) => parseTierPoints(a.points) - parseTierPoints(b.points));
    return sorted.reduce((current, tier) => parseTierPoints(points) >= parseTierPoints(tier.points) ? tier : current, sorted[0]);
  };

  const [editingTierId, setEditingTierId] = useState<number | null>(null);
  const [editedTier, setEditedTier] = useState<any>(null);
  const [expandedSquadId, setExpandedSquadId] = useState<number | string | null>(null); // To expand squad details
  const [editingSquadId, setEditingSquadId] = useState<number | string | null>(null);
  const [editedSquadName, setEditedSquadName] = useState('');

  const startEditSquad = (squad: any) => {
    setEditingSquadId(squad.id);
    setEditedSquadName(squad.name || '');
  };

  const saveSquadName = (id: any) => {
    const nextName = editedSquadName.trim();
    if (!nextName) {
      toast.error('اكتب اسم الديوانية أولاً');
      return;
    }
    setSquads(squads.map((sq: any) => sq.id === id ? { ...sq, name: nextName } : sq));
    setEditingSquadId(null);
    setEditedSquadName('');
    toast.success('تم تعديل اسم الديوانية');
  };

  const deleteSquad = (squad: any) => {
    if (!squad || squad.id === undefined || squad.id === null) {
      toast.error('تعذر تحديد الديوانية المراد حذفها');
      return;
    }
    const currentSquads = Array.isArray(data?.squads) ? data.squads : squads;
    const nextSquads = currentSquads.filter((sq: any) => String(sq.id) !== String(squad.id));

    // Use the direct object update because this project persists setData through Firebase;
    // functional setData was not always applied from this screen.
    setData({ ...data, squads: nextSquads });

    if (String(expandedSquadId) === String(squad.id)) setExpandedSquadId(null);
    if (String(editingSquadId) === String(squad.id)) {
      setEditingSquadId(null);
      setEditedSquadName('');
    }
    toast.success('تم حذف الديوانية');
  };


  const getIcon = (type: string) => {
    switch(type) {
      case 'Medal': return <Medal />;
      case 'Star': return <Star />;
      case 'Crown': return <Crown />;
      case 'Trophy': return <Trophy />;
      default: return <Target />;
    }
  };

  const handleCopyLink = () => {
    const textToCopy = "https://alturathkw.shop/?showSquads=true";
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => toast.success('تم نسخ رابط دعوة الدواوين! (' + textToCopy + ')'))
        .catch(() => fallbackCopyTextToClipboard(textToCopy));
    } else {
      fallbackCopyTextToClipboard(textToCopy);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('تم نسخ رابط دعوة الدواوين! (' + text + ')');
      } else {
        toast.error('فشل في نسخ الرابط');
      }
    } catch (err) {
      toast.error('فشل في نسخ الرابط');
    }
    
    document.body.removeChild(textArea);
  };

  const openWhatsApp = (phone: string, squadName: string) => {
    const message = encodeURIComponent(`\u2728 مرحباً يا ديوانية ${squadName}!\nنشكركم على ولائكم الدائم لمطبخ التراث الكويتي.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const startEditTier = (tier: any) => {
    setEditingTierId(tier.id);
    setEditedTier({ ...tier });
  };

  const saveEditTier = () => {
    if (!editedTier) return;
    
    const parsePoints = (p: string) => parseInt(p.toString().replace(/,/g, '') || '0', 10);
    const newPoints = parsePoints(editedTier.points);
    
    const currentIndex = tiers.findIndex(t => t.id === editedTier.id);
    
    if (currentIndex !== -1) {
      if (currentIndex > 0) {
        const prevPoints = parsePoints(tiers[currentIndex - 1].points);
        if (newPoints <= prevPoints) {
          toast.error(`عذراً، يجب أن تكون النقاط للمستوى الحالي أكبر من نقاط المستوى السابق (${tiers[currentIndex - 1].name}: ${tiers[currentIndex - 1].points})`);
          return;
        }
      }
      if (currentIndex < tiers.length - 1) {
        const nextPoints = parsePoints(tiers[currentIndex + 1].points);
        if (newPoints >= nextPoints) {
          toast.error(`عذراً، يجب أن تكون النقاط للمستوى الحالي أقل من نقاط المستوى التالي (${tiers[currentIndex + 1].name}: ${tiers[currentIndex + 1].points})`);
          return;
        }
      }
    }

    setTiers(tiers.map(t => t.id === editedTier.id ? editedTier : t));
    setEditingTierId(null);
    setEditedTier(null);
    toast.success("تم تحديث المستوى بنجاح!");
  };

  const deleteTier = (id: number) => {
    setTiers(tiers.filter(t => t.id !== id));
    if (editingTierId === id) { setEditingTierId(null); setEditedTier(null); }
    toast.success("تم حذف المستوى");
  };

  const cancelEditTier = () => {
    if (editedTier?.name === 'مستوى جديد') {
      setTiers(tiers.filter(t => t.id !== editedTier.id));
    }
    setEditingTierId(null);
    setEditedTier(null);
    toast.info('تم إلغاء تعديل المستوى');
  };

  const addTier = () => {
    const newTier = {
      id: Date.now(),
      name: 'مستوى جديد',
      points: '20,000',
      label: 'مكافأة جديدة',
      color: 'from-emerald-400 to-teal-600',
      bgClass: 'border-emerald-200 bg-emerald-50',
      iconType: 'Target'
    };
    setTiers([...tiers, newTier]);
    startEditTier(newTier);
    setTimeout(() => {
      document.getElementById(`tier-${newTier.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header section */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <Swords className="w-8 h-8 text-amber-400" />
               </div>
               <div>
                  <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
                    بطولات الديوانية (Squad Rewards)
                  </h2>
                  <p className="text-amber-100/70 font-medium mt-1">حوّل ولاء الأفراد إلى ولاء جماعي وتنافس شرس بين الدواوين!</p>
               </div>
             </div>
             {onNavigate && (
               <button 
                 onClick={() => onNavigate('dashboard')} 
                 className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
               >
                 <X size={24} />
               </button>
             )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
               <div className="text-amber-400/80 text-xs font-bold mb-1">إجمالي الدواوين المسجلة</div>
               <div className="text-3xl font-black">{squads.length} <span className="text-sm font-normal text-white/50">ديوانية</span></div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
               <div className="text-amber-400/80 text-xs font-bold mb-1">الديوانية المتصدرة</div>
               <div className="text-xl font-bold truncate mt-2">{[...squads].sort((a,b) => (b.points || 0) - (a.points || 0))[0]?.name || '-'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
               <div className="text-amber-400/80 text-xs font-bold mb-1">أكثر ملك ديوانية طلباً</div>
               <div className="text-xl font-bold mt-2">
                 {(() => {
                   const topKingSquad = [...squads].sort((a,b) => (b.kingOrders || 0) - (a.kingOrders || 0))[0];
                   return topKingSquad ? `${topKingSquad.king} (${topKingSquad.kingOrders || 0} طلب)` : '-';
                 })()}
               </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition" onClick={handleCopyLink}>
               <Copy className="w-5 h-5 text-amber-400" />
               <span className="font-bold">انسخ رابط التسجيل للعملاء</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'leaderboard' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>لوحة الصدارة 🔥</button>
        <button onClick={() => setActiveTab('squads')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'squads' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>إدارة الدواوين 👥</button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>إعدادات التحديات ⚙️</button>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-black text-slate-800 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> شريط المستويات</div>
          <div className="text-[10px] font-bold text-slate-400">يتم تحديد مستوى الديوانية تلقائياً حسب النقاط إذا لم يكن محدداً</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...tiers].sort((a, b) => parseTierPoints(a.points) - parseTierPoints(b.points)).map((tier) => (
            <div key={tier.id} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className={`absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b ${tier.color || 'from-slate-300 to-slate-500'}`} />
              <div className="pr-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${tier.color || 'from-slate-300 to-slate-500'} shadow-sm shrink-0`}>{getIcon(tier.iconType)}</div>
                <div className="min-w-0">
                  <div className="font-black text-slate-800 text-sm truncate">{tier.name}</div>
                  <div className="text-[10px] font-bold text-slate-500">من {tier.points} نقطة</div>
                  <div className="text-[10px] font-semibold text-slate-400 truncate">{tier.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeTab === 'leaderboard' && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-4">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">أقوى 5 دواوين هذا الأسبوع <Flame className="text-rose-500" /></h3>
                 
                 <div className="bg-white border text-right border-slate-200/60 rounded-3xl p-2 shadow-sm overflow-hidden">
                   {[...squads].sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0,5).map((squad, i) => (
                     <div key={squad.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 rounded-2xl">
                       <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner border ${i === 0 ? 'bg-amber-100 border-amber-300 text-amber-600' : i === 1 ? 'bg-slate-100 border-slate-300 text-slate-600' : i === 2 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                         #{i + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2 truncate">
                           {squad.name} 
                           {squad.tier === 'شيوخ' && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider shrink-0">شيوخ</span>}
                           {squad.tier === 'نواخذة' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] uppercase font-black shrink-0">نواخذة</span>}
                         </h4>
                         <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                           <span className="flex items-center gap-1"><Users size={14} /> {squad.members} أعضاء</span>
                           <span className="flex items-center gap-1 text-amber-600"><Star size={14} /> {(squad.points || 0).toLocaleString('en-GB')} نقطة جماعية</span>
                         </div>
                       </div>
                       <div className="hidden sm:flex flex-col items-center bg-slate-50 p-2 border border-slate-100 rounded-xl min-w-[120px]">
                         <span className="text-[10px] text-slate-400 font-bold mb-1">ملك الديوانية 👑</span>
                         <span className="text-sm font-bold text-slate-800 truncate max-w-[100px]">{squad.king}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 text-white text-center relative overflow-hidden shadow-xl border border-purple-800">
                    <Trophy className="w-48 h-48 text-yellow-400 opacity-[0.03] absolute -top-8 -right-8 pointer-events-none" />
                    <h3 className="font-bold text-xl mb-2 relative z-10">وسام الفخر (الفاتورة)</h3>
                    <p className="text-sm font-medium text-purple-200 opacity-90 relative z-10 leading-relaxed">
                      هكذا ستظهر الفاتورة للديوانية المتصدرة، مما يخلق شعوراً بالفخر والتنافس كل مرة يطلبون فيها:
                    </p>
                    <div className="mt-6 bg-white text-slate-800 p-4 rounded-xl text-right relative z-10 shadow-2xl skew-y-1 transform scale-95 border-b-4 border-slate-200">
                      <div className="text-center font-black mb-4 border-b border-dashed border-slate-300 pb-2">مطعم التراث</div>
                      <div className="flex justify-between text-sm font-bold mb-1"><span>مجبوس لحم</span> <span>6.500 د.ك</span></div>
                      <div className="flex justify-between text-sm font-bold mb-4"><span>مربين</span> <span>5.500 د.ك</span></div>
                      
                      <div className="bg-amber-50 p-3 rounded-lg border-2 border-amber-200 text-center animate-pulse relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                         <Crown className="w-5 h-5 text-amber-500 mx-auto mb-1 relative z-10" />
                         <div className="font-extrabold text-amber-800 text-xs relative z-10">عضو في "{[...squads].sort((a,b) => (b.points || 0) - (a.points || 0))[0]?.name || 'ديوانية'}"</div>
                         <div className="font-bold text-amber-600 text-[10px] mt-1 relative z-10">المركز الأول 🥇</div>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'settings' && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-2">
                      مستويات الدواوين (Tiers & Rewards)
                    </h3>
                    <p className="text-slate-500 text-sm font-medium max-w-2xl">
                      كلما طلبت مجموعة الديوانية أكثر، ارتقوا للمستوى التالي وفتحوا ميزات دائمة. هذا يضمن ولائهم التام وصعوبة انتقالهم لمنافس لأنهم سيفقدون امتيازاتهم التراكمية.
                    </p>
                  </div>
                  <button onClick={addTier} className="p-2 bg-slate-900 border text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-slate-800 shrink-0">
                    <Plus size={16} /> إضافة مستوى
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tiers.map((t, idx) => (
                    <div id={`tier-${t.id}`} key={t.id} className={`relative p-5 rounded-3xl border-2 transition-all group ${editingTierId === t.id ? 'ring-2 ring-blue-500 border-transparent shadow-md' : 'hover:-translate-y-1'} ${t.bgClass || 'border-slate-200 bg-slate-50/50'}`}>
                       <div className="absolute top-2 left-2 flex gap-1 z-10">
                         {editingTierId === t.id ? (
                           <button onClick={saveEditTier} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors tooltip" title="حفظ">
                             <Check size={14} />
                           </button>
                         ) : (
                           <>
                             <button onClick={() => startEditTier(t)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors tooltip" title="تعديل">
                               <Edit2 size={14} />
                             </button>
                             <button onClick={() => deleteTier(t.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors tooltip" title="حذف">
                               <Trash2 size={14} />
                             </button>
                           </>
                         )}
                       </div>

                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${t.color} shadow-sm mb-4`}>
                          {getIcon(t.iconType)}
                       </div>

                       {editingTierId === t.id ? (
                         <div className="space-y-3 mt-2 font-sans">
                           <div className="flex gap-2">
                             <select 
                               className="w-1/2 text-xs font-bold bg-white border border-slate-200 p-2 rounded-lg"
                               value={editedTier.iconType}
                               onChange={e => setEditedTier({...editedTier, iconType: e.target.value})}
                             >
                               <option value="Medal">ميدالية</option>
                               <option value="Star">نجمة</option>
                               <option value="Crown">تاج</option>
                               <option value="Trophy">كأس</option>
                               <option value="Target">هدف</option>
                               <option value="Flame">شعلة</option>
                               <option value="Swords">سيوف</option>
                             </select>
                             <select 
                               className="w-1/2 text-xs font-bold bg-white border border-slate-200 p-2 rounded-lg"
                               value={editedTier.color}
                               onChange={e => {
                                 const color = e.target.value;
                                 let bgClass = editedTier.bgClass;
                                 if (color.includes('orange')) bgClass = 'border-orange-200 bg-orange-50/50';
                                 else if (color.includes('slate')) bgClass = 'border-slate-300 bg-slate-50/50';
                                 else if (color.includes('yellow')) bgClass = 'border-amber-300 bg-amber-50';
                                 else if (color.includes('purple')) bgClass = 'border-purple-300 bg-purple-50 shadow-lg';
                                 else if (color.includes('emerald')) bgClass = 'border-emerald-200 bg-emerald-50';
                                 else if (color.includes('blue')) bgClass = 'border-blue-200 bg-blue-50';
                                 else if (color.includes('rose')) bgClass = 'border-rose-200 bg-rose-50';
                                 setEditedTier({...editedTier, color, bgClass});
                               }}
                             >
                               <option value="from-orange-400 to-orange-600">برتقالي</option>
                               <option value="from-slate-300 to-slate-500">فضي</option>
                               <option value="from-yellow-400 to-amber-600">ذهبي</option>
                               <option value="from-purple-500 to-fuchsia-700">بنفسجي</option>
                               <option value="from-emerald-400 to-teal-600">زمردي</option>
                               <option value="from-blue-400 to-indigo-600">أزرق</option>
                               <option value="from-rose-400 to-pink-600">وردي</option>
                             </select>
                           </div>
                           <input 
                             type="text" 
                             value={editedTier.name} 
                             onChange={e => setEditedTier({...editedTier, name: e.target.value})}
                             className="w-full text-sm font-bold bg-white border border-slate-200 p-2 rounded-lg"
                             placeholder="اسم المستوى"
                             autoFocus
                           />
                           <input 
                             type="text" 
                             value={editedTier.points} 
                             onChange={e => {
                               const engVal = e.target.value.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
                               setEditedTier({...editedTier, points: engVal});
                             }}
                             className="w-full text-xs font-bold bg-white border border-slate-200 p-2 rounded-lg dir-ltr text-left"
                             placeholder="النقاط المطلوبة"
                             dir="ltr"
                           />
                           <textarea 
                             value={editedTier.label} 
                             onChange={e => setEditedTier({...editedTier, label: e.target.value})}
                             className="w-full text-xs font-bold bg-white border border-slate-200 p-2 rounded-lg resize-none h-16"
                             placeholder="وصف المكافأة"
                           />
                         </div>
                       ) : (
                         <>
                           <h4 className="font-bold text-slate-800 text-lg mb-1">{t.name}</h4>
                           <div className="text-xs font-bold text-slate-500 mb-4 bg-white/60 px-3 py-1.5 rounded-lg inline-block border border-slate-200/50">آلية التفعيل: {t.points} نقطة</div>
                           
                           <div className="mt-4 pt-4 border-t border-slate-200/60">
                             <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">المكافأة الدائمة</span>
                             <span className="font-bold text-[13px] text-slate-700 leading-relaxed block min-h-[40px]">{t.label}</span>
                           </div>
                         </>
                       )}
                    </div>
                  ))}
                </div>
             </div>
          </motion.div>
        </AnimatePresence>
      )}

      {activeTab === 'squads' && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm min-h-[400px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">إدارة الدواوين (Squads CRM)</h3>
                    <p className="text-xs text-slate-500 mt-1">يتم احتساب النقاط بناءً على المبيعات: <strong>كل ١ دينار = ١ نقطة</strong> لجميع أعضاء الديوانية بناءً على أرقام هواتفهم.</p>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="ابحث عن ديوانية..." className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium outline-none focus:border-blue-500 w-full max-w-[200px]" />
                  </div>
                </div>

                <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-right whitespace-nowrap min-w-[700px]" dir="rtl">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-4 pr-6">اسم الديوانية</th>
                        <th className="p-4">المستوى</th>
                        <th className="p-4 text-center">النقاط الإجمالية</th>
                        <th className="p-4 text-center">الأعضاء</th>
                        <th className="p-4">أكثر عضو ولاءً (الملك)</th>
                        <th className="p-4 pl-6 text-left">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {squads.map(s => {
                          const sortedArr = [...squads].sort((a,b) => (b.points || 0) - (a.points || 0));
                          const rank = sortedArr.findIndex(x => x.id === s.id) + 1;
                          const points = s.points || 0;
                          const displayTier = s.tier || getTierForPoints(points)?.name || 'شلة ديوانية';
                          
                          let waMsg = `\u2728 مرحباً يا ${s.name}!\nرصيدكم الحالي ${points} نقطة، وتصنيفكم ${s.tier}.\nكل طلب يقربكم من الصدارة.`;
                          if (rank === 1 && points > 0) {
                            waMsg = `\u2728 مرحباً يا ${s.name}!\nنبارك لكم تصدركم المركز الأول في بطولات الديوانية برصيد ${points} نقطة.\nاستمروا وفالكم البيرق يا ${s.tier}.`;
                          } else if (rank <= 3 && points > 0) {
                            waMsg = `\u2728 مرحباً يا ${s.name}!\nأنتم في المركز ${rank} برصيد ${points} نقطة.\nالمركز الأول قريب، شدوا حيلكم.`;
                          } else if (points === 0) {
                            waMsg = `\u2728 مرحباً يا ${s.name}!\nسجلنا ديوانيتكم عندنا، ناطرين أول طلب عشان تبدأون المنافسة وتجمعون النقاط.`;
                          }
                          
                          return (
                        <React.Fragment key={s.id}>
                          <tr className={`transition-colors cursor-pointer ${expandedSquadId === s.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`} onClick={() => setExpandedSquadId(expandedSquadId === s.id ? null : s.id)}>
                            <td className="p-4 pr-6 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                {editingSquadId === s.id ? (
                                  <input
                                    value={editedSquadName}
                                    onChange={(e) => setEditedSquadName(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 min-w-[180px]"
                                    autoFocus
                                  />
                                ) : (
                                  <span>{s.name}</span>
                                )}
                                {expandedSquadId === s.id ? <span className="text-blue-500 text-xs">▼</span> : <span className="text-slate-400 text-xs">◀</span>}
                              </div>
                            </td>
                            <td className="p-4">
                               <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${displayTier === 'شيوخ' ? 'bg-purple-100 text-purple-700' : displayTier === 'نواخذة' ? 'bg-amber-100 text-amber-700' : displayTier === 'عزوة' ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                 {displayTier}
                               </span>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-600">{(s.points || 0).toLocaleString()} نقطة</td>
                            <td className="p-4 text-center font-bold">{s.members}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0 text-slate-700">{(s.king || '?').charAt(0)}</div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-slate-700">{s.king || 'لا يوجد'} 👑</span>
                                  <span className="text-[10px] text-slate-400">{s.kingOrders || 0} طلبات</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 pl-6 text-left" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {editingSquadId === s.id ? (
                                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveSquadName(s.id); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="حفظ الاسم">
                                    <Check size={16} />
                                  </button>
                                ) : (
                                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditSquad(s); }} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" title="تعديل اسم الديوانية">
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteSquad(s);
                                  }}
                                  className="relative z-30 inline-flex items-center justify-center p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white active:scale-95 transition-all cursor-pointer pointer-events-auto"
                                  title="حذف الديوانية"
                                  aria-label="حذف الديوانية"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <a 
                                  href={`https://wa.me/${s.phone}?text=${encodeURIComponent(waMsg)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors tooltip inline-block"
                                  title="تواصل عبر الواتساب"
                                >
                                  <MessageCircle size={16} />
                                </a>
                              </div>
                            </td>
                          </tr>
                          {expandedSquadId === s.id && s.membersList && (
                            <tr className="bg-slate-50/50 hidden md:table-row">
                              <td colSpan={6} className="p-0">
                                <div className="p-4 pr-12 bg-blue-50/10 border-t border-b border-blue-100/50">
                                  <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">تفاصيل نقاط الأعضاء الفردية</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {s.membersList.map((member, i) => (
                                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                                          {(member.name || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-bold text-sm text-slate-800">{member.name || 'غير معروف'}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{member.phone}</div>
                                        </div>
                                        <div className="text-left">
                                          <div className="font-black text-blue-600">{(member.points || 0).toLocaleString()}</div>
                                          <div className="text-[9px] text-slate-400">نقطة</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {expandedSquadId === s.id && s.membersList && (
                            <tr className="bg-slate-50/50 md:hidden table-row">
                              <td colSpan={6} className="p-0">
                                <div className="p-4 bg-blue-50/10 border-t border-b border-blue-100/50">
                                  <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">تفاصيل نقاط الأعضاء الفردية</h4>
                                  <div className="flex flex-col gap-2">
                                    {s.membersList.map((member, i) => (
                                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                                          {(member.name || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-bold text-sm text-slate-800">{member.name || 'غير معروف'}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{member.phone}</div>
                                        </div>
                                        <div className="text-left">
                                          <div className="font-black text-blue-600">{(member.points || 0).toLocaleString()}</div>
                                          <div className="text-[9px] text-slate-400">نقطة</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          </motion.div>
        </AnimatePresence>
      )}

    </div>
  );
};

