import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Download, Check, Save, Upload, X, Loader2, MousePointerSquareDashed, Zap, ChevronLeft, Layout, Edit3, Brain, Library, MessageCircle, Film, PlayCircle, Copy, RotateCcw } from 'lucide-react';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from '../constants';
import { toast } from 'sonner';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { RealtimeRadar } from './RealtimeRadar';
import { ReviewToPoster } from './ReviewToPoster';
import { AdaptiveBranding } from './AdaptiveBranding';
import { applyLogoBranding } from '../lib/brandingUtils';
import { BrandingControls } from './BrandingControls';
import { REAL_RESTAURANT_BACKGROUNDS, STUDIO_REALITY_MODES, STUDIO_REALITY_NEGATIVE_PROMPT, type StudioBackgroundPresetId, type StudioRealityMode } from '../lib/studioReality';
import { buildStudioTastePrompt, loadStudioBackgroundLibrary, markStudioBackgroundUsed, recordStudioTasteChoice, saveStudioBackgroundToLibrary, type StudioBackgroundLibraryItem } from '../lib/studioLearning';
import { KUWAIT_CONTENT_GOALS, KUWAIT_PLACES, KUWAIT_PULSE_PACKS, buildKuwaitCaptionFallback, buildKuwaitStudioTheme, getKuwaitPulsePack, type KuwaitContentGoal, type KuwaitOrderPlace } from '../lib/kuwaitContentPulse';
import { loadStudioArchive, saveStudioArchive } from '../lib/studioArchive';

interface SmartContentStudioProps {
  data: any;
  setData: (data: any) => void;
  onNavigate: (page: string) => void;
}

type RealityAuditResult = {
  score?: number;
  verdict?: string;
  notes?: string[];
  fixHint?: string;
};

type ProductStudioFlow = 'quick' | 'kuwait' | 'pro';

type StudioSceneSuggestion = {
  productType?: string;
  reason?: string;
  place: KuwaitOrderPlace;
  pulseId: string;
  mode: StudioRealityMode;
  background: StudioBackgroundPresetId;
  mood: string;
  themeHint?: string;
  confidence?: number;
};


type StudioReelHistoryItem = {
  url: string;
  poster?: string | null;
  date: Date;
  duration: number;
  shot: string;
  source: 'idea' | 'image';
  format: '9:16';
  idea?: string;
  place?: KuwaitOrderPlace;
  mood?: string;
};

type StudioHistoryItem = {
  url: string;
  caption: string | null;
  date: Date;
  mode?: StudioRealityMode;
  background?: StudioBackgroundPresetId;
  theme?: string;
  format?: string;
  source?: 'idea' | 'image' | 'reel';
  packId?: string;
  place?: KuwaitOrderPlace;
  mood?: string;
  customIdea?: string;
};

class StudioErrorBoundary extends React.Component<{ title: string; children: React.ReactNode }, { hasError: boolean; message: string }> {
  declare props: Readonly<{ title: string; children: React.ReactNode }>;
  declare state: Readonly<{ hasError: boolean; message: string }>;

  constructor(props: { title: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'صار خلل غير متوقع' };
  }

  componentDidCatch(error: any) {
    console.error('Smart studio tab crashed:', error);
  }

  render() {
    if (this.state.hasError) {
    
  return (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-8 text-right shadow-sm">
          <h3 className="text-lg font-black text-rose-700 mb-2">ما قدرنا نفتح {this.props.title}</h3>
          <p className="text-sm font-bold text-rose-600/80 leading-7">منعنا الشاشة البيضاء. حدّث الصفحة أو جرّب مرة ثانية، وإذا تكرر الخطأ راجع بيانات هذا القسم.</p>
          {this.state.message && <p className="mt-3 text-xs text-rose-500 bg-white/70 rounded-2xl p-3 direction-ltr text-left">{this.state.message}</p>}
        </div>
      );
    }
    return this.props.children;
  }
}

export const SmartContentStudio: React.FC<SmartContentStudioProps> = ({ data, setData, onNavigate }) => {
  const [studioTab, setStudioTab] = useState<'home' | 'create' | 'quick' | 'whatsapp' | 'occasions' | 'product' | 'reel' | 'library' | 'advanced'>('home');
  const [createStep, setCreateStep] = useState<number>(1);
  const [productStep, setProductStep] = useState<number>(1);
  const [maxCreateStepReached, setMaxCreateStepReached] = useState<number>(1);
  const [maxProductStepReached, setMaxProductStepReached] = useState<number>(1);
  const [showCreateOccasion, setShowCreateOccasion] = useState(false);
  const [showProductOccasion, setShowProductOccasion] = useState(false);
  const [fineToolTab, setFineToolTab] = useState<'lighting' | 'reality'>('lighting');
  const [showFineTools, setShowFineTools] = useState(false);
  const [showPlaceLibrary, setShowPlaceLibrary] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [showBrandingPanel, setShowBrandingPanel] = useState(false);
  const [archiveTab, setArchiveTab] = useState<'idea' | 'image' | 'reel'>('idea');
  const [reelStep, setReelStep] = useState<number>(1);
  const [reelDuration, setReelDuration] = useState<number>(8);
  const [reelShot, setReelShot] = useState<string>('hero-push');
  const [reelSource, setReelSource] = useState<'idea' | 'image'>('idea');
  const [generatedReel, setGeneratedReel] = useState<string | null>(null);
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [showReelSettings, setShowReelSettings] = useState(false);
  const [reelHistory, setReelHistory] = useState<StudioReelHistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('1:1');
  const [selectedTheme, setSelectedTheme] = useState('نبض الكويت');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [previousAiCaption, setPreviousAiCaption] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const reelImageInputRef = useRef<HTMLInputElement>(null);

  const previewAspectClass = selectedFormat === '9:16' ? 'aspect-[9/16] max-h-[680px]' : selectedFormat === '4:3' ? 'aspect-[4/3]' : 'aspect-square';

  const formats = [
    { id: '1:1', label: 'Instagram Post', sub: '1:1', icon: <ImageIcon size={16} /> },
    { id: '9:16', label: 'Story / TikTok', sub: '9:16', icon: <ImageIcon size={16} className="h-5" /> },
    { id: '4:3', label: 'إعلان بسيط', sub: '4:3', icon: <ImageIcon size={16} className="w-5" /> }
  ];

  const reelShots = [
    { id: 'hero-push', label: 'اقتراب سينمائي', desc: 'الكاميرا تدخل بهدوء على الطبق', icon: '🎥' },
    { id: 'box-open', label: 'فتح علبة طلب', desc: 'كشف نظيف وسريع للطلب', icon: '📦' },
    { id: 'steam-close', label: 'بخار ولمعة', desc: 'لقطة قريبة دافئة جداً', icon: '♨️' },
    { id: 'table-pass', label: 'مرور على السفرة', desc: 'حركة بسيطة على عدة أطباق', icon: '🍽️' },
    { id: 'sauce-motion', label: 'حركة صوص', desc: 'تفصيل صغير يفتح الشهية', icon: '🥄' },
  ];

  const themes = [
    { id: 'نبض الكويت', label: 'نبض الكويت', desc: 'مشهد + بيئة + هدف، بأبسط طريق للموظف', icon: '🇰🇼', color: 'bg-rose-100 text-rose-700' },
    { id: 'بيت', label: 'سفرة بيتية', desc: 'طلب منزلي مرتب وواقعي', icon: '🏠', color: 'bg-amber-100 text-amber-700' },
    { id: 'ديوانية', label: 'ديوانية', desc: 'يمعة ربع وطلب جماعي', icon: '🛋️', color: 'bg-slate-100 text-slate-700' },
    { id: 'شاليه', label: 'شاليه', desc: 'طلعة وويكند بدون زحمة', icon: '🌊', color: 'bg-blue-100 text-blue-700' },
    { id: 'مزرعة', label: 'مزرعة', desc: 'سفرة خارجية واقعية', icon: '🌴', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'جاخور', label: 'جاخور', desc: 'طلب ربع عملي ومرتب', icon: '🐪', color: 'bg-orange-100 text-orange-700' },
    { id: 'زوارة', label: 'زوارة / عزيمة', desc: 'لمة أهل وطلب يبيض الوجه', icon: '👨‍👩‍👧‍👦', color: 'bg-purple-100 text-purple-700' },
    { id: 'تنظيف', label: 'تحسين فقط', desc: 'تحسين الألوان والإضاءة الأصلية دون تغيير المشهد', icon: '✨', color: 'bg-indigo-100 text-indigo-700' }
  ];

  const moods = [
    { id: 'دافئ', label: 'شمس دافئة', icon: '☀️' },
    { id: 'بارد', label: 'إضاءة باردة', icon: '❄️' },
    { id: 'غروب', label: 'وقت الغروب', icon: '🌇' },
    { id: 'ناعم', label: 'إضاءة استوديو', icon: '☁️' }
  ];

  const mergedScenes = [
    { id: 'quick-kuwait', label: 'طلب سريع (توصيل)', desc: 'كرتون وتغليف جاهز للتوصيل', icon: '⚡', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'home-delivery', label: 'طلب منزلي (سفرة)', desc: 'على سفرة بيتية واقعية ومرتبة', icon: '🏠', place: 'home', mode: 'finalBoss', background: 'home-table' },
    { id: 'diwaniya-night', label: 'ديوانية الربع', desc: 'يمعة ربع وطلب جماعي بالديوانية', icon: '🛋️', place: 'diwaniya', mode: 'human', background: 'diwaniya-table' },
    { id: 'chalet-weekend', label: 'يمعة الشاليه', desc: 'طلعة البحر وأجواء عطلة ويكند مريحة', icon: '🌊', place: 'chalet', mode: 'human', background: 'chalet-spread' },
    { id: 'zowara-family', label: 'زوارة أهل', desc: 'لمة العائلة وسفرة تفتح النفس للضيافة', icon: '👨‍👩‍👧‍👦', place: 'zowara', mode: 'menu', background: 'zowara-spread' },
    { id: 'farm-gathering', label: 'سفرة المزرعة', desc: 'جلسة خارجية بظل طبيعي لمزرعة أو حديقة', icon: '🌴', place: 'farm', mode: 'human', background: 'farm-gathering' },
    { id: 'jakhour-setup', label: 'قعدة الجاخور', desc: 'طلعة عملية للربع في قعدة الجاخور المرتبة', icon: '🐪', place: 'jakhour', mode: 'human', background: 'jakhour-setup' },
    { id: 'national-day', label: 'أجواء العيد الوطني', desc: 'لمة كويتية دافئة وراقية بنكهة العيد الوطني', icon: '🇰🇼', place: 'home', mode: 'finalBoss', background: 'home-table' },
  ];



  const FORBIDDEN_STUDIO_WORDS = ['دلة', 'دلال', 'مبخر', 'مباخر', 'بخور', 'عود', 'سدو', 'فانوس', 'فوانيس', 'قهوة', 'قهوت', 'بن', 'فنجان', 'فناجين', 'كلينكس', 'منديل مستخدم', 'مناديل مستخدمة', 'منديل وصخ', 'مناديل وصخة', 'مخلفات'];
  const sanitizeStudioPrompt = (value: string) =>
    FORBIDDEN_STUDIO_WORDS.reduce((text, word) => text.replace(new RegExp(word, 'g'), ''), String(value || ''))
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([،.])/g, '$1')
      .trim();
  const STUDIO_NEGATIVE_PROMPT = STUDIO_REALITY_NEGATIVE_PROMPT;

  const [customThemeQuery, setCustomThemeQuery] = useState('');
  const [selectedPulseId, setSelectedPulseId] = useState<string>('quick-kuwait');
  const [selectedOrderPlace, setSelectedOrderPlace] = useState<KuwaitOrderPlace>('delivery');
  const [selectedContentGoal, setSelectedContentGoal] = useState<KuwaitContentGoal>('whatsapp');
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [productStudioFlow, setProductStudioFlow] = useState<ProductStudioFlow>('quick');
  const [selectedMood, setSelectedMood] = useState('دافئ');
  const [realityMode, setRealityMode] = useState<StudioRealityMode>('restaurant');
  const [backgroundPreset, setBackgroundPreset] = useState<StudioBackgroundPresetId>('wood-table');
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [realityVariants, setRealityVariants] = useState<{ label: string; url: string; mode: StudioRealityMode; background: StudioBackgroundPresetId }[]>([]);
  const [isSuggestingScene, setIsSuggestingScene] = useState(false);
  const [sceneSuggestion, setSceneSuggestion] = useState<StudioSceneSuggestion | null>(null);
  const [strictPlateLock, setStrictPlateLock] = useState(true);
  const [realityBoost, setRealityBoost] = useState(true);
  const [isAuditingReality, setIsAuditingReality] = useState(false);
  const [realityAudit, setRealityAudit] = useState<RealityAuditResult | null>(null);
  const [backgroundLibrary, setBackgroundLibrary] = useState<StudioBackgroundLibraryItem[]>([]);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [tasteMemoryPrompt, setTasteMemoryPrompt] = useState('');
  const [showInstagramPreview, setShowInstagramPreview] = useState(false);
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.7);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [history, setHistory] = useState<StudioHistoryItem[]>([]);


  const refreshStudioLearning = async () => {
    setTasteMemoryPrompt(buildStudioTastePrompt());
    const library = await loadStudioBackgroundLibrary();
    setBackgroundLibrary(library);
  };

  useEffect(() => {
    refreshStudioLearning();
  }, []);


  const productStudioFlows: Record<ProductStudioFlow, { icon: string; title: string; desc: string; badge: string; tone: string }> = {
    quick: {
      icon: '⚡',
      title: 'تحسين سريع',
      desc: 'ارفع الصورة واضغط توليد. نضبط الإضاءة والواقعية بدون قرارات كثيرة.',
      badge: 'للموظف',
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700'
    },
    kuwait: {
      icon: '🇰🇼',
      title: 'بيئة واقعية',
      desc: 'اختار مشهد وبيئة واقعية بعد المقاس والفكرة.',
      badge: 'للإبداع',
      tone: 'bg-rose-50 border-rose-200 text-rose-700'
    },
    pro: {
      icon: '🎛️',
      title: 'تصوير احترافي',
      desc: 'كل الأدوات الجميلة: عدسات، خلفيات، شعار، تقييم، ٤ لقطات، ذاكرة الذوق.',
      badge: 'للأدمن',
      tone: 'bg-indigo-50 border-indigo-200 text-indigo-700'
    }
  };

  const selectProductStudioFlow = (flow: ProductStudioFlow) => {
    setProductStudioFlow(flow);
    setShowAdvancedStudio(flow === 'pro');
    if (flow === 'quick') {
      setSelectedTheme('تنظيف');
      setSelectedContentGoal('product');
      setBackgroundPreset('neutral-menu');
      setRealityMode('menu');
    }
    if (flow === 'kuwait') {
      setSelectedTheme('نبض الكويت');
      setSelectedContentGoal('product');
      const place = KUWAIT_PLACES[selectedOrderPlace] || KUWAIT_PLACES.delivery;
      setBackgroundPreset(place.background);
    }
  };

  const activePulsePack = getKuwaitPulsePack(selectedPulseId);

  const applySceneSuggestion = (suggestion: StudioSceneSuggestion) => {
    const pack = getKuwaitPulsePack(suggestion.pulseId);
    const place = KUWAIT_PLACES[suggestion.place] ? suggestion.place : pack.defaultPlace;
    setSelectedPulseId(pack.id);
    setSelectedOrderPlace(place);
    setBackgroundPreset(suggestion.background || KUWAIT_PLACES[place].background);
    setRealityMode(suggestion.mode || pack.mode);
    setSelectedMood(suggestion.mood || 'دافئ');
    setSelectedTheme('نبض الكويت');
    setSelectedContentGoal('product');
    setRealityBoost(true);
    setStrictPlateLock(true);
    setProductStudioFlow('kuwait');
    setShowAdvancedStudio(false);
  };

  const recommendSceneFromImage = async (imageDataUrl: string) => {
    setIsSuggestingScene(true);
    setSceneSuggestion(null);
    try {
      const productHints = (data?.products || [])
        .slice(0, 80)
        .map((p: any) => [p?.name, p?.category, p?.description].filter(Boolean).join(' - '))
        .filter(Boolean);
      const response = await fetch('/api/smart-studio/recommend-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageDataUrl,
          productHints,
          currentFormat: selectedFormat,
          tasteProfile: buildStudioTastePrompt()
        })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result) throw new Error(result?.error || 'recommendation failed');
      const suggestion = result as StudioSceneSuggestion;
      applySceneSuggestion(suggestion);
      setSceneSuggestion(suggestion);
    } catch (err) {
      const fallback: StudioSceneSuggestion = {
        productType: 'طبق كويتي',
        reason: 'اعتمدت إعدادات واقعية آمنة لأن التحليل الذكي لم يكتمل.',
        place: 'delivery',
        pulseId: 'quick-kuwait',
        mode: 'finalBoss',
        background: 'delivery-packaging',
        mood: 'دافئ',
        confidence: 68
      };
      applySceneSuggestion(fallback);
      setSceneSuggestion(fallback);
    } finally {
      setIsSuggestingScene(false);
    }
  };

  useEffect(() => {
    const pack = getKuwaitPulsePack(selectedPulseId);
    setRealityMode(pack.mode);
    setBackgroundPreset(pack.background);
    setSelectedOrderPlace(pack.defaultPlace);
    setSceneSuggestion(null);
  }, [selectedPulseId]);

  useEffect(() => {
    loadStudioArchive<StudioHistoryItem>('smart_studio_history', ['url']).then((items) => {
      setHistory(items.map((item: any) => ({ ...item, date: new Date(item.date) })));
    });
  }, []);

  useEffect(() => {
    loadStudioArchive<StudioReelHistoryItem>('smart_studio_reel_history', ['url', 'poster']).then((items) => {
      setReelHistory(items.map((item: any) => ({ ...item, date: new Date(item.date) })));
    });
  }, []);

  useEffect(() => {
    saveStudioArchive('smart_studio_history', history, ['url'], 18);
  }, [history]);

  useEffect(() => {
    saveStudioArchive('smart_studio_reel_history', reelHistory, ['url', 'poster'], 18);
  }, [reelHistory]);

  useEffect(() => {
    if (aiImage) {
      applyBranding(aiImage).then(setGeneratedImage);
    }
  }, [useBranding, logoOpacity, logoPosition, brandingStyle, customText, textPosition, aiImage]);

  useEffect(() => {
    if (!generatedImage || studioTab !== 'product') {
      setShowBrandingPanel(false);
    }
  }, [generatedImage, studioTab]);

  const addToHistory = (url: string, caption: string | null, meta?: Partial<StudioHistoryItem>) => {
    setHistory(prev => {
      const nextItem: StudioHistoryItem = {
        url,
        caption,
        date: new Date(),
        mode: realityMode,
        background: backgroundPreset,
        theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme,
        format: selectedFormat,
        packId: selectedPulseId,
        place: selectedOrderPlace,
        mood: selectedMood,
        customIdea: customThemeQuery,
        ...meta
      };
      const newHistory = [nextItem, ...prev.filter(item => item.url !== url)].slice(0, 12);
      // التخزين يتم في useEffect بنسخة خفيفة، حتى تبقى الصورة الحالية ظاهرة بدون كسر المتصفح.
      return newHistory;
    });
  };

  const getDataImagePayload = (dataUrl: string) => {
    const [header, data] = String(dataUrl || '').split(',');
    return {
      imageContent: data || dataUrl,
      mimeType: header?.includes(':') ? header.split(';')[0].split(':')[1] : 'image/jpeg'
    };
  };

  const applyBranding = async (sourceImage: string): Promise<string> => {
    const storeName = data.settings?.storeName || '';
    const logoUrl = data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO;
    return await applyLogoBranding(sourceImage, logoUrl, storeName, {
      useBranding,
      brandingStyle,
      logoOpacity,
      logoPosition,
      customText,
      textPosition,
    });
  };

  const compressImage = (base64Str: string, maxWidth = 1080): Promise<{base64: string, size: number, originalSize: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Optimized for social media (1080px is recommended for high quality socials)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output as jpeg with a balanced 0.8 quality for social media excellence
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        const originalSize = Math.round((base64Str.length * 3) / 4);
        const compressedSize = Math.round((compressedBase64.length * 3) / 4);
        
        resolve({
          base64: compressedBase64,
          size: compressedSize,
          originalSize: originalSize
        });
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setOriginalImage(base64);
        
        // Compress automatically
        const result = await compressImage(base64);
        setCompressedImage(result.base64);
        if (result.size > 5 * 1024 * 1024) {
          alert('الصورة بعدها كبيرة حتى بعد الضغط. اختار صورة أصغر أو قصّها قبل الرفع.');
          return;
        }
        setSelectedImage(result.base64);
        setCompressionStats({ original: result.originalSize, compressed: result.size });
        setGeneratedImage(null);
        setShowImageSettings(false);
        setShowBrandingPanel(false);
        setRealityAudit(null);
        setRealityVariants([]);
        setProductStep(1);
        setMaxProductStepReached(1);
        recommendSceneFromImage(result.base64);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleReelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const result = await compressImage(base64, 1080);
      setOriginalImage(base64);
      setCompressedImage(result.base64);
      setSelectedImage(result.base64);
      setCompressionStats({ original: result.originalSize, compressed: result.size });
      setReelSource('image');
      setGeneratedReel(null);
      setShowReelSettings(false);
      toast.success('تم تجهيز الصورة كمصدر للريل');
    };
    reader.readAsDataURL(file);
  };

  const generateContent = async (variantOverride?: { mode?: StudioRealityMode; background?: StudioBackgroundPresetId; label?: string }) => {
    if (!selectedImage) return;
    const themeText = sanitizeStudioPrompt(buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: selectedTheme === 'مخصص' ? customThemeQuery : `${selectedTheme}. ${customThemeQuery}`
    }));

    setIsGenerating(true);
    setGeneratedImage(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setRealityAudit(null);

    // Call backend API to process the realistic AI image
    try {
      const response = await fetch('/api/smart-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: selectedImage.split(',')[1],
          mimeType: selectedImage.split(';')[0].split(':')[1],
          format: selectedFormat,
          theme: `${themeText}. ${STUDIO_NEGATIVE_PROMPT}`,
          mood: selectedMood,
          realityMode: variantOverride?.mode || realityMode,
          backgroundPreset: variantOverride?.background || backgroundPreset,
          strictPlateLock,
          realityBoost,
          correctionHint: variantOverride?.label?.includes('أصدق') ? 'أعد بناء الخلفية لتكون أبسط وأكثر بشرية وكويتية: ظلال تلامس صحيحة، سفرة/طلب عادي، إضاءة أقل مثالية، بدون لمعان أو عمق مبالغ، وبدون إيحاء مطعم.' : undefined,
          tasteProfile: buildStudioTastePrompt(),
          speedTier: 'turbo' // Signal for faster generation logic if available
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.needsKey) {
          throw new Error('KEY_REQUIRED');
        }
        throw new Error(errorData.error || 'ما قدرنا نولّد الصورة');
      }

      const resData = await response.json();
      let imageResult = resData.imageUrl || resData.image || resData.url || resData.dataUrl || resData.base64 || resData.imageBase64 || resData.data?.imageUrl || resData.data?.url || resData.data?.base64;
      if (imageResult && typeof imageResult === 'string' && !imageResult.startsWith('http') && !imageResult.startsWith('data:')) {
        imageResult = `data:image/png;base64,${imageResult}`;
      }
      if (imageResult) {
        setAiImage(imageResult);
        const branded = await applyBranding(imageResult).catch(() => imageResult);
        setGeneratedImage(branded);
        const usedMode = variantOverride?.mode || realityMode;
        const usedBackground = variantOverride?.background || backgroundPreset;
        const themeUsed = themeText;
        addToHistory(branded, null, { mode: usedMode, background: usedBackground, theme: themeUsed, format: selectedFormat, source: 'image' });
        recordStudioTasteChoice({ mode: usedMode, background: usedBackground, theme: themeUsed, format: selectedFormat, label: variantOverride?.label || STUDIO_REALITY_MODES[usedMode].label, source: 'generated-image' });
        refreshStudioLearning();
        if (variantOverride?.label) {
          setRealityVariants(prev => [...prev, {
            label: variantOverride.label || STUDIO_REALITY_MODES[variantOverride.mode || realityMode].label,
            url: branded,
            mode: variantOverride.mode || realityMode,
            background: variantOverride.background || backgroundPreset
          }].slice(-4));
        }
      } else {
        toast.error("تم التوليد، بس رابط الصورة ما وصل بشكل مفهوم");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'KEY_REQUIRED') {
        alert("توليد الصور يحتاج مفتاح Gemini مدفوع ومفعّل من الإعدادات.");
      } else {
        alert("التوليد تعطل: " + err.message + ". تأكد من المفتاح والنت.");
      }
    } finally {
      setIsGenerating(false);
    }
  };



  const generateKuwaitNoProduct = async () => {
    const themeText = sanitizeStudioPrompt(buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: customThemeQuery || activePulsePack.label
    }));
    setIsGenerating(true);
    setGeneratedImage(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setRealityAudit(null);
    try {
      const prompt = `${themeText}\nGenerate a believable Kuwaiti occasion / delivery / gathering image without requiring a product upload. Make it look like a real photographed Kuwaiti order moment, suitable for WhatsApp first. No readable text inside the image. ${STUDIO_NEGATIVE_PROMPT}`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format: selectedFormat, realityBoost: true, tasteProfile: buildStudioTastePrompt() })
      });
      const imgData = await imgRes.json().catch(() => ({}));
      if (!imgRes.ok) throw new Error(imgData?.error || 'ما قدرنا نولّد صورة المشهد');
      let imageResult = imgData.imageUrl || imgData.image || imgData.url || imgData.base64 || imgData.data?.imageUrl || imgData.data?.url;
      if (imageResult && typeof imageResult === 'string' && !imageResult.startsWith('http') && !imageResult.startsWith('data:')) imageResult = `data:image/png;base64,${imageResult}`;
      if (!imageResult) throw new Error('تم التوليد، بس رابط الصورة ما وصل بشكل مفهوم');
      setAiImage(imageResult);
      const branded = await applyBranding(imageResult).catch(() => imageResult);
      setGeneratedImage(branded);
      const caption = buildKuwaitCaptionFallback({ packId: selectedPulseId, place: selectedOrderPlace || activePulsePack.defaultPlace, goal: selectedContentGoal });
      setPreviousAiCaption(aiCaption);
      setAiCaption(caption);
      addToHistory(branded, caption, { mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, source: 'idea' });
      recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, label: 'kuwait-no-product', source: 'quick-no-product' });
      refreshStudioLearning();
      toast.success('تم تجهيز صورة ورسالة كويتية بدون رفع منتج');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'ما قدرنا نولّد المشهد');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCaption = async () => {
    if (!aiCaption) return;
    try {
      await writeClipboardText(aiCaption);
      toast.success('تم نسخ رسالة الواتساب');
    } catch {
      toast.info('انسخ الرسالة يدويًا من المعاينة');
    }
  };

  const generateFourRealityOptions = async () => {
    if (!selectedImage || isGenerating || isGeneratingVariants) return;
    setIsGeneratingVariants(true);
    setRealityVariants([]);
        setProductStep(1);
    const variantPlan: { label: string; mode: StudioRealityMode; background: StudioBackgroundPresetId }[] = [
      { label: 'بشري / آيفون', mode: 'human', background: 'wood-table' },
      { label: 'طلب كويتي واقعي', mode: 'restaurant', background: 'home-table' },
      { label: 'منيو احترافي', mode: 'menu', background: 'neutral-menu' },
      { label: 'واقعية قصوى', mode: 'finalBoss', background: 'diwaniya-table' },
    ];
    try {
      for (const variant of variantPlan) {
        await generateContent(variant);
      }
      toast.success('تم توليد 4 خيارات واقعية — اختر الأنسب للنشر');
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const auditReality = async () => {
    const source = aiImage || generatedImage;
    if (!source || isAuditingReality) return;
    setIsAuditingReality(true);
    try {
      const payload = getDataImagePayload(source);
      const response = await fetch('/api/smart-studio/reality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('ما قدرنا نفحص الواقعية');
      const result = await response.json();
      setRealityAudit(result);
      toast.success(`تقييم الواقعية: ${Math.round(Number(result.score || 0))}%`);
    } catch (err: any) {
      toast.error(err?.message || 'ما قدرنا نفحص الواقعية');
    } finally {
      setIsAuditingReality(false);
    }
  };

  const makeMoreHuman = async () => {
    if (!selectedImage || isGenerating || isGeneratingVariants) return;
    setRealityMode('finalBoss');
    const hint = realityAudit?.fixHint || 'خل الخلفية أبسط وأكثر بشرية وكويتية: طلب بيت/ديوانية/شاليه عادي، ظلال صحيحة، إضاءة أقل مثالية، لا لمعان زائد، لا عمق مبالغ، لا ديكور وهمي.';
    await generateContent({ mode: 'finalBoss', background: backgroundPreset || 'wood-table', label: `أصدق بصرياً: ${hint}` });
  };


  const rememberCurrentChoice = (label = 'اختيار يدوي') => {
    recordStudioTasteChoice({
      mode: realityMode,
      background: backgroundPreset,
      theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme,
      format: selectedFormat,
      label,
      source: 'manual-choice'
    });
    refreshStudioLearning();
    toast.success('تم حفظ ذوقك لهذا الأسلوب — استوديو الصورة الذكية راح يفضله لاحقاً');
  };

  const saveCurrentBackground = async () => {
    const source = aiImage || generatedImage;
    if (!source || isSavingBackground) return;
    setIsSavingBackground(true);
    try {
      const saved = await saveStudioBackgroundToLibrary({
        url: source,
        caption: aiCaption,
        mode: realityMode,
        background: backgroundPreset,
        theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme,
        format: selectedFormat,
        label: STUDIO_REALITY_MODES[realityMode]?.label || 'لقطة واقعية',
        auditScore: realityAudit?.score ?? null,
        source: 'product-studio'
      });
      setBackgroundLibrary(prev => [saved, ...prev.filter(item => item.id !== saved.id)].slice(0, 24));
      setTasteMemoryPrompt(buildStudioTastePrompt());
      toast.success('تم حفظ اللقطة في مكتبة الخلفيات — وجرى تعلّم ذوقك');
    } catch (err: any) {
      toast.error(err?.message || 'ما قدرنا نحفظ الخلفية');
    } finally {
      setIsSavingBackground(false);
    }
  };

  const useLibraryBackground = (item: StudioBackgroundLibraryItem) => {
    setAiImage(item.url);
    setGeneratedImage(item.url);
    setAiCaption(item.caption || null);
    if (item.mode) setRealityMode(item.mode);
    if (item.background) setBackgroundPreset(item.background);
    markStudioBackgroundUsed(item);
    refreshStudioLearning();
      toast.success('اخترت لقطة من مكتبتك — النظام تعلم هذا الذوق');
  };

  const handleDownload = () => {
    if (!generatedImage && !aiImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `smart-studio-${selectedTheme}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('تم تحميل الصورة بنجاح!');
  };

  const generateCaption = async () => {
    if (!generatedImage) return;
    setIsCapturing(true);
    try {
      // Resize image for text generation to reduce payload size safely
      const safeBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // max dimension 800px is very safe and enough for captioning
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             // Generate low quality jpeg for quick and small API payload
             resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
             resolve(generatedImage || aiImage || "");
          }
        };
        img.onerror = () => resolve(generatedImage || aiImage || "");
        img.src = generatedImage || aiImage || "";
      });

      const response = await fetch('/api/smart-studio/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: safeBase64,
          theme: `${buildKuwaitStudioTheme({ packId: selectedPulseId, place: selectedOrderPlace || activePulsePack.defaultPlace, goal: selectedContentGoal, customText: customThemeQuery || selectedTheme })}. ${STUDIO_NEGATIVE_PROMPT}`
        })
      });
      let res: any = null;
      let isHtml = false;
      try {
        res = await response.json();
      } catch (e) {
        isHtml = true;
      }
      
      if (!response.ok) {
        throw new Error(isHtml ? 'المعذرة، حجم الصورة كبير جداً للمعالجة' : (res?.error || 'Failed to generate caption'));
      }

      const caption = res?.caption || `صورة تسويقية جاهزة بأسلوب ${selectedTheme}.`;
      setPreviousAiCaption(aiCaption);
      setAiCaption(caption);
      toast.success('تم توليد التعليق الذكي على الصورة');
      if (generatedImage) {
        setHistory(prev => prev.map(item => item.url === generatedImage ? {...item, caption} : item));
      }
    } catch (e: any) {
      console.error(e);
      const fallbackCaption = `صورة تسويقية جاهزة بأسلوب ${selectedTheme}.`;
      setPreviousAiCaption(aiCaption);
      setAiCaption(fallbackCaption);
      if (generatedImage) {
        setHistory(prev => prev.map(item => item.url === generatedImage ? {...item, caption: fallbackCaption} : item));
      }
      toast.info('جهزنا نص مبدئي، بس خدمة النص الذكي ما ردت الحين');
    } finally {
      setIsCapturing(false);
    }
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
      alert('تعطل الحفظ. جرّب مرة ثانية.');
    } finally {
      setIsSaving(false);
    }
  };



  const cleanRealityLabel = (label: string) => String(label || '')
    .replace(/Reality\s*/gi, '')
    .replace(/Final\s*Boss/gi, 'واقعية قصوى')
    .replace(/Boss/gi, 'قصوى')
    .replace(/Core/gi, '')
    .trim() || 'واقعية عالية';

  const writeClipboardText = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) throw new Error('copy-failed');
    return true;
  };


  const buildReelPrompt = () => {
    const shot = reelShots.find((s) => s.id === reelShot);
    const place = KUWAIT_PLACES[selectedOrderPlace] || KUWAIT_PLACES.delivery;
    const idea = customThemeQuery.trim() || `${activePulsePack.label} لطلب كويتي واقعي من مطبخ التراث الكويتي`;
    return `Reel عمودي 9:16 احترافي لمطبخ التراث الكويتي. فكرة مختصرة: ${idea}. لقطة واحدة فاخرة وواضحة: ${shot?.label || 'اقتراب ناعم'}. مكان: ${place.label}. مدة ${reelDuration} ثواني. حركة كاميرا ناعمة وثابتة، الطعام واضح ومثبت في المنتصف، تكوين بصري نظيف، إضاءة واقعية شهية، عمق ميدان خفيف، بدون تعليق صوتي، بدون شخص يتكلم، بدون شفاه، بدون وجوه واضحة، بدون نصوص أو شعارات أو تشويه. جودة عالية مناسبة لريلز إنستغرام مع مظهر تصوير طعام حقيقي. إضاءة ${selectedMood}.`;
  };

  const buildReelSettingsText = (item?: Partial<StudioReelHistoryItem>) => {
    const shot = reelShots.find((s) => s.id === (item?.shot || reelShot));
    const placeId = item?.place || selectedOrderPlace;
    return [
      `المسار: ريل قصير`,
      `المصدر: ${(item?.source || reelSource) === 'image' ? 'من صورة' : 'من فكرة'}`,
      `المقاس: 9:16`,
      `المدة: ${item?.duration || reelDuration} ثواني`,
      `اللقطة: ${shot?.label || reelShot}`,
      `المكان: ${KUWAIT_PLACES[placeId]?.label || KUWAIT_PLACES.delivery.label}`,
      `الإضاءة: ${moods.find((m) => m.id === (item?.mood || selectedMood))?.label || selectedMood}`,
      (item?.idea || customThemeQuery.trim()) ? `الفكرة: ${item?.idea || customThemeQuery.trim()}` : ''
    ].filter(Boolean).join('\n');
  };

  const copyReelSettings = async (item?: StudioReelHistoryItem) => {
    try {
      await writeClipboardText(buildReelSettingsText(item));
      toast.success('تم نسخ إعدادات الريل');
    } catch {
      toast.info('الإعدادات ظاهرة أمامك للنسخ اليدوي');
    }
  };

  const generateReel = async () => {
    if (!customThemeQuery.trim() && reelSource === 'idea') {
      toast.error('اكتب فكرة قصيرة للريل أو اختر من صورة');
      return;
    }
    if (reelSource === 'image' && !selectedImage) {
      toast.error('ارفع صورة للطبق أولاً');
      return;
    }
    setIsGeneratingReel(true);
    setGeneratedReel(null);
    setShowReelSettings(false);
    try {
      const payload: any = {
        prompt: buildReelPrompt(),
        duration: reelDuration,
        shotType: reelShot,
        format: '9:16',
        resolution: '720x1280',
        targetResolution: '720x1280',
        quality: 'premium',
        renderMode: 'balanced-premium',
        compression: 'balanced',
        bitrate: '2200k',
        fps: 24,
        audio: false,
        voiceover: false,
        noTalking: true,
        tokenBudget: 'low',
        place: selectedOrderPlace,
        mood: selectedMood,
        tasteProfile: buildStudioTastePrompt(),
      };
      if (reelSource === 'image' && selectedImage) {
        const img = getDataImagePayload(selectedImage);
        payload.imageContent = img.imageContent;
        payload.mimeType = img.mimeType;
      }
      const response = await fetch('/api/smart-studio/generate-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.videoUrl) {
        const rawError = String(result?.error || '');
        const friendlyError = /quota|حصة|limit|exhaust/i.test(rawError)
          ? 'تعذّر توليد الريل من الخادم حالياً. جرّب مرة ثانية أو قلّل المدة؛ الرصيد لا يمنع ظهور المحاولة هنا.'
          : (rawError || 'ما قدرنا نولّد الريل');
        throw new Error(friendlyError);
      }
      setGeneratedReel(result.videoUrl);
      if (result?.fallback) {
        toast.info('Veo مزدحم/حصته واقفة، جهزنا لك ريل موشن خفيف وفوري بدل ما يوقف الشغل.');
      }
      const item: StudioReelHistoryItem = {
        url: result.videoUrl,
        poster: result.posterUrl || null,
        date: new Date(),
        duration: reelDuration,
        shot: reelShot,
        source: reelSource,
        format: '9:16',
        idea: customThemeQuery.trim(),
        place: selectedOrderPlace,
        mood: selectedMood
      };
      setReelHistory(prev => [item, ...prev.filter(r => r.url !== item.url)].slice(0, 18));
      toast.success('الريل جاهز وخفيف ومحفوظ في أرشيف الريلز');
    } catch (e: any) {
      toast.error(e?.message || 'ما قدرنا نولّد الريل الحين');
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const downloadReel = () => {
    if (!generatedReel) return;
    const a = document.createElement('a');
    a.href = generatedReel;
    a.download = generatedReel.startsWith('data:image/svg') ? `smart-studio-motion-reel-${Date.now()}.svg` : `smart-studio-reel-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderFineTools = () => {
    const toolTabs = [
      { id: 'lighting' as const, label: 'الإضاءة', icon: '☀️' },
      { id: 'reality' as const, label: 'الواقعية', icon: '✓' },
    ];

    return (
      <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50 p-3 space-y-3">
        <button
          type="button"
          onClick={() => setShowFineTools(!showFineTools)}
          className="w-full rounded-3xl bg-white border border-slate-100 p-4 text-right flex items-center justify-between gap-3"
        >
          <span>
            <span className="block text-xs font-black text-slate-500">أدوات دقيقة</span>
            <span className="block text-sm font-black text-slate-950 mt-1">افتحها فقط عند الحاجة للتعديل</span>
          </span>
          <ChevronLeft className={cn("transition-transform text-slate-400", showFineTools ? "-rotate-90" : "")} size={20} />
        </button>

        {showFineTools && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {toolTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFineToolTab(tab.id)}
                  className={cn(
                    "rounded-2xl px-3 py-3 text-sm font-black transition-all flex items-center justify-center gap-2",
                    fineToolTab === tab.id ? "bg-slate-950 text-white shadow-md" : "bg-white text-slate-500 border border-slate-100"
                  )}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {fineToolTab === 'lighting' && (
              <div className="rounded-3xl border border-amber-100 bg-white p-4">
                <p className="text-[11px] font-black text-amber-700 mb-3">اختر إحساس الإضاءة</p>
                <div className="grid grid-cols-2 gap-2">
                  {moods.map(m => (
                    <button key={m.id} type="button" onClick={() => setSelectedMood(m.id)} className={cn("p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all", selectedMood === m.id ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-600") }>
                      <span className="text-xl">{m.icon}</span><span className="text-[11px] font-black">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fineToolTab === 'reality' && (
              <div className="rounded-3xl border border-emerald-100 bg-white p-4">
                <p className="text-[11px] font-black text-emerald-700 mb-3">أسلوب الصورة النهائي</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STUDIO_REALITY_MODES) as [StudioRealityMode, typeof STUDIO_REALITY_MODES[StudioRealityMode]][]).map(([id, item]) => (
                    <button key={id} type="button" onClick={() => setRealityMode(id)} className={cn("p-3 rounded-2xl border text-right transition-all", realityMode === id ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-600") }>
                      <span className="block text-xs font-black">{cleanRealityLabel(item.label)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPlaceLibrary = () => (
    <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50 p-3 space-y-3">
      <button
        type="button"
        onClick={() => setShowPlaceLibrary(!showPlaceLibrary)}
        className="w-full rounded-3xl bg-white border border-slate-100 p-4 text-right flex items-center justify-between gap-3"
      >
        <span>
          <span className="block text-xs font-black text-slate-500">مشاهد واقعية جاهزة</span>
          <span className="block text-sm font-black text-slate-950 mt-1">{KUWAIT_PLACES[selectedOrderPlace]?.icon} {KUWAIT_PLACES[selectedOrderPlace]?.label}</span>
        </span>
        <ChevronLeft className={cn("transition-transform text-slate-400", showPlaceLibrary ? "-rotate-90" : "")} size={20} />
      </button>
      {showPlaceLibrary && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(KUWAIT_PLACES) as [KuwaitOrderPlace, typeof KUWAIT_PLACES[KuwaitOrderPlace]][]).map(([id, place]) => (
            <button key={id} type="button" onClick={() => { setSelectedOrderPlace(id); setBackgroundPreset(place.background); setShowPlaceLibrary(false); }} className={cn("rounded-2xl border p-3 text-right transition-all min-h-[72px]", selectedOrderPlace === id ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50") }>
              <span className="text-xl">{place.icon}</span>
              <span className="block text-xs font-black mt-1">{place.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );


  const closeOpenPanels = () => {
    setShowCreateOccasion(false);
    setShowProductOccasion(false);
    setShowFineTools(false);
    setShowPlaceLibrary(false);
  };

  const resetGeneratedOutput = () => {
    setGeneratedImage(null);
    setAiImage(null);
    setAiCaption(null);
    setPreviousAiCaption(null);
    setRealityVariants([]);
    setRealityAudit(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setShowInstagramPreview(false);
  };

  const startFreshImageUpload = () => {
    resetGeneratedOutput();
    setSelectedImage(null);
    setCompressionStats(null);
    setProductStep(1);
    setMaxProductStepReached(1);
    setStudioTab('product');
    setTimeout(() => productImageInputRef.current?.click(), 50);
  };

  const goHome = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    setStudioTab('home');
  };

  const goCreateStep = (step: number) => {
    if (step > maxCreateStepReached) return;
    closeOpenPanels();
    setCreateStep(step);
  };

  const goProductStep = (step: number) => {
    if (step > maxProductStepReached) return;
    closeOpenPanels();
    setProductStep(step);
  };

  const advanceCreateStep = (step: number) => {
    closeOpenPanels();
    setMaxCreateStepReached(prev => Math.max(prev, step));
    setCreateStep(step);
  };

  const advanceProductStep = (step: number) => {
    closeOpenPanels();
    setMaxProductStepReached(prev => Math.max(prev, step));
    setProductStep(step);
  };

  const buildSettingsText = (item?: Partial<StudioHistoryItem>) => {
    const formatLabel = item?.format || selectedFormat;
    const pack = item?.packId ? getKuwaitPulsePack(item.packId) : activePulsePack;
    const placeId = item?.place || selectedOrderPlace;
    const modeId = item?.mode || realityMode;
    const moodLabel = item?.mood || selectedMood;
    const ideaText = item?.customIdea || customThemeQuery;
    return [
      `المسار: ${(item?.source || (studioTab === 'product' ? 'image' : 'idea')) === 'image' ? 'من صورة' : 'من فكرة'}`,
      `المقاس: ${formatLabel}`,
      `المشهد الذكي: ${pack?.label || activePulsePack.label} / ${KUWAIT_PLACES[placeId]?.label || KUWAIT_PLACES[selectedOrderPlace]?.label}`,
      `الإضاءة: ${moods.find((m) => m.id === moodLabel)?.label || moodLabel}`,
      `الواقعية: ${cleanRealityLabel(STUDIO_REALITY_MODES[modeId]?.label || '')}`,
      ideaText ? `الفكرة: ${ideaText}` : ''
    ].filter(Boolean).join('\n');
  };

  const copyCurrentSettings = async () => {
    const text = buildSettingsText();
    try {
      await writeClipboardText(text);
      toast.success('تم نسخ إعدادات الصورة');
    } catch {
      toast.info('الإعدادات ظاهرة أمامك للنسخ اليدوي');
    }
  };

  const compressionSavedPercent = compressionStats?.original
    ? Math.max(0, Math.round((1 - compressionStats.compressed / compressionStats.original) * 100))
    : null;

  const hasWrittenIdea = customThemeQuery.trim().length > 0;
  const fullStudioSteps = [
    { n: 1, t: 'مقاس' },
    { n: 2, t: 'فكرة' },
    { n: 3, t: 'المشهد' },
    { n: 5, t: 'أدوات' },
    { n: 6, t: 'توليد' },
  ];
  const ideaFastSteps = [
    { n: 1, t: 'مقاس' },
    { n: 2, t: 'فكرة' },
    { n: 5, t: 'أدوات' },
    { n: 6, t: 'توليد' },
  ];
  const visibleStudioSteps = hasWrittenIdea ? ideaFastSteps : fullStudioSteps;
  const renderStageProgress = (currentStep: number, setStep: (step: number) => void) => {
    const steps = visibleStudioSteps;
    const maxAllowedStep = studioTab === 'product' ? maxProductStepReached : maxCreateStepReached;
    const currentIndex = Math.max(0, steps.findIndex((s) => s.n === currentStep));
    const current = steps[currentIndex] || steps[0];
    return (
      <div className="mb-5">
        <div className="md:hidden rounded-[22px] border border-slate-100 bg-slate-50 p-3 flex items-center justify-between gap-3">
          <span className="h-10 px-4 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-xs font-black">{currentIndex + 1} من {steps.length}</span>
          <div className="text-right">
            <div className="text-sm font-black text-slate-900">{current.t}</div>
            <div className="text-[10px] font-bold text-slate-400">المرحلة الحالية</div>
          </div>
        </div>
        <div className="hidden md:grid gap-1 rounded-[24px] border border-slate-100 bg-slate-50 p-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, idx) => (
            <button key={s.n} type="button" disabled={s.n > maxAllowedStep} onClick={() => { closeOpenPanels(); setStep(s.n); }} className={cn("rounded-2xl px-2 py-2 text-center transition-all", currentStep === s.n ? "bg-slate-950 text-white shadow-md" : s.n > maxAllowedStep ? "bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60" : "bg-white text-slate-500 border border-slate-100") }>
              <div className="text-[10px] font-black">{idx + 1}</div>
              <div className="text-[9px] font-black mt-1 whitespace-nowrap">{s.t}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="mb-8 rounded-[2.4rem] bg-[radial-gradient(circle_at_top_left,_#4338ca,_#0f172a_46%,_#020617)] p-6 md:p-7 shadow-2xl border border-white/10 text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-l from-transparent via-white/25 to-transparent" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/10"><Camera className="w-7 h-7 text-indigo-200" /></span>
              استوديو الصورة الذكية
            </h1>
          </div>
          <button onClick={() => setStudioTab('library')} className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10 text-white flex items-center justify-center backdrop-blur shrink-0" title="الأرشيف">
            <Library size={18} />
          </button>
        </div>
        
        <div className="relative z-10 mt-5 flex items-center justify-between gap-3">
          {studioTab !== 'home' ? (
            <button onClick={goHome} className="h-10 w-10 md:w-auto md:px-4 rounded-2xl text-sm font-black bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center justify-center gap-2">
              <ChevronLeft size={18} className="rotate-180" />
              <span className="hidden md:inline">رجوع</span>
            </button>
          ) : <div />}
        </div>
      </div>

      {studioTab === 'home' && (
        <div className="max-w-4xl mx-auto rounded-[2rem] bg-white border border-slate-100 shadow-sm p-5 text-right">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black text-indigo-500 mb-1">اختَر البداية</p>
              <h2 className="text-2xl font-black text-slate-950">ابدأ بفكرة أو بصورة</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); setCreateStep(1); setMaxCreateStepReached(1); setStudioTab('create'); }} className="rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white p-5 text-right transition-all">
              <Sparkles className="text-indigo-500 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">من فكرة</div>
              <div className="text-xs font-bold text-slate-400 mt-1">اكتب وصفك، أو اختر قالباً جاهزاً.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setProductStep(1); setMaxProductStepReached(1); setStudioTab('product'); }} className="rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white p-5 text-right transition-all">
              <Camera className="text-indigo-500 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">من صورة</div>
              <div className="text-xs font-bold text-slate-400 mt-1">ارفع صورة المنتج ونرتّبها بواقعية أعلى.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setSelectedFormat('9:16'); setReelStep(1); setReelSource('idea'); setGeneratedReel(null); setShowReelSettings(false); setStudioTab('reel'); }} className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white hover:bg-white p-5 text-right transition-all relative overflow-hidden">
              <Film className="text-violet-600 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">ريل قصير</div>
              <div className="text-xs font-bold text-slate-400 mt-1">فيديو واقعي 4–8 ثواني جاهز لريلز.</div>
            </button>
          </div>
        </div>
      )}

      {studioTab === 'library' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-right">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Library size={20} className="text-indigo-500 shrink-0" /> الأرشيف</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">صورك المحفوظة من الاستوديو</p>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 border border-slate-100 p-1 w-full sm:w-auto sm:min-w-[190px]">
              <button type="button" onClick={() => setArchiveTab('idea')} className={cn("rounded-xl px-3 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'idea' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>الفكرة</button>
              <button type="button" onClick={() => setArchiveTab('image')} className={cn("rounded-xl px-3 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'image' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>الصورة</button>
              <button type="button" onClick={() => setArchiveTab('reel')} className={cn("rounded-xl px-3 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'reel' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>الريلز</button>
            </div>
          </div>
          {(() => {
            if (archiveTab === 'reel') {
              return reelHistory.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reelHistory.map((item, idx) => (
                    <button key={idx} onClick={() => { setGeneratedReel(item.url); setReelDuration(item.duration); setReelShot(item.shot); setReelSource(item.source); if (item.idea) setCustomThemeQuery(item.idea); if (item.place) setSelectedOrderPlace(item.place); if (item.mood) setSelectedMood(item.mood); setShowReelSettings(true); setStudioTab('reel'); }} className="group rounded-3xl overflow-hidden border border-slate-100 bg-slate-950 shadow-sm hover:shadow-md transition-all text-right">
                      {item.url?.startsWith('data:image') ? <img src={item.url} className="w-full aspect-[9/16] object-cover bg-black" alt="ريل موشن" /> : <video src={item.url} className="w-full aspect-[9/16] object-cover bg-black" muted playsInline />}
                      <div className="p-3 text-[11px] font-bold text-white/70 line-clamp-2">ريل {item.duration} ثواني · {reelShots.find(s => s.id === item.shot)?.label || 'لقطة واقعية'}</div>
                    </button>
                  ))}
                </div>
              ) : <div className="rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-12 text-center text-slate-500 font-bold">الريلز المحفوظة تظهر هنا.</div>;
            }
            const allItems = history.filter(item => item.url);
            const items = allItems.filter((item) => archiveTab === 'idea' ? item.source !== 'image' : item.source === 'image');
            return items.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((item, idx) => (
                  <button key={idx} onClick={() => { setGeneratedImage(item.url); setAiImage(item.url); setAiCaption(item.caption); if (item.format) setSelectedFormat(item.format); if (item.mode) setRealityMode(item.mode); if (item.background) setBackgroundPreset(item.background); if (item.packId) setSelectedPulseId(item.packId); if (item.place) setSelectedOrderPlace(item.place); if (item.mood) setSelectedMood(item.mood); if (item.customIdea) { setCustomThemeQuery(item.customIdea); setSelectedTheme('مخصص'); } setShowImageSettings(true); setStudioTab(archiveTab === 'image' ? 'product' : 'create'); }} className="group rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right">
                    <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                    <div className="p-3 text-[11px] font-bold text-slate-500 line-clamp-2">{item.caption || (archiveTab === 'image' ? 'صورة منتج' : 'صورة من فكرة')}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-12 text-center text-slate-500 font-bold">
                {archiveTab === 'idea' ? 'صور الأفكار المحفوظة تظهر هنا.' : 'صور المنتجات المحفوظة تظهر هنا.'}
              </div>
            );
          })()}
        </div>
      )}


      {studioTab === 'reel' && (
        <div className="grid lg:grid-cols-[390px_minmax(0,1fr)] gap-6 items-start">
          <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-5 text-right">
            <div className="mb-5">
              <p className="text-xs font-black text-violet-500 mb-1">ريل قصير</p>
              <h2 className="text-2xl font-black text-slate-950">فيديو واقعي جاهز للنشر</h2>
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">4–8 ثواني، عمودي، حركة بسيطة، وواقعية نظيفة لمشروعك.</p>
            </div>

            <div className="mb-5 md:hidden rounded-[22px] border border-slate-100 bg-slate-50 p-3 flex items-center justify-between gap-3">
              <span className="h-10 px-4 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-xs font-black">{reelStep} من 4</span>
              <div className="text-right"><div className="text-sm font-black text-slate-900">{reelStep === 1 ? 'البداية' : reelStep === 2 ? 'اللقطة' : reelStep === 3 ? 'المدة' : 'التوليد'}</div><div className="text-[10px] font-bold text-slate-400">ريل واقعي</div></div>
            </div>

            {reelStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setReelSource('idea')} className={cn("rounded-2xl border p-4 text-right transition-all", reelSource === 'idea' ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-slate-50 text-slate-600 border-slate-100")}><Sparkles size={18} className="mb-2" /><span className="block text-sm font-black">من فكرة</span></button>
                  <button type="button" onClick={() => setReelSource('image')} className={cn("rounded-2xl border p-4 text-right transition-all", reelSource === 'image' ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-slate-50 text-slate-600 border-slate-100")}><Camera size={18} className="mb-2" /><span className="block text-sm font-black">من صورة</span></button>
                </div>
                {reelSource === 'idea' && (
                  <input type="text" placeholder="مثال: لقطة مجبوس حار يفتح الشهية لريلز إنستغرام..." value={customThemeQuery} onChange={(e) => setCustomThemeQuery(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-violet-500 transition-all duration-300 animate-in fade-in" />
                )}
                {reelSource === 'image' && (
                  <div onClick={() => reelImageInputRef.current?.click()} className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 cursor-pointer text-center">
                    <input type="file" ref={reelImageInputRef} className="hidden" accept="image/*" onChange={handleReelImageUpload} />
                    <Camera className="mx-auto mb-2 text-violet-600" size={26} />
                    <p className="text-sm font-black text-slate-800">{selectedImage ? 'الصورة جاهزة للريل' : 'ارفع صورة طبق للريل'}</p>{selectedImage && <p className="mt-1 text-[10px] font-bold text-violet-500">اضغط هنا لتغيير الصورة</p>}
                  </div>
                )}
                <button type="button" onClick={() => setReelStep(2)} className="w-full p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
              </div>
            )}

            {reelStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500">اختر نوع اللقطة</p>
                <div className="grid grid-cols-1 gap-2">
                  {reelShots.map((shot) => (
                    <button key={shot.id} type="button" onClick={() => setReelShot(shot.id)} className={cn("rounded-2xl border p-4 text-right transition-all flex items-center gap-3", reelShot === shot.id ? "bg-violet-50 border-violet-400 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50")}>
                      <span className="text-2xl">{shot.icon}</span><span><span className="block text-sm font-black text-slate-900">{shot.label}</span><span className="block text-[11px] font-bold text-slate-400 mt-1">{shot.desc}</span></span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={() => setReelStep(3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button></div>
              </div>
            )}

            {reelStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500">مدة الريل</p>
                <div className="grid grid-cols-2 gap-2">
                  {[6, 8].map((seconds) => <button key={seconds} type="button" onClick={() => setReelDuration(seconds)} className={cn("rounded-2xl border p-5 text-center transition-all", reelDuration === seconds ? "bg-violet-50 border-violet-500 text-violet-700 shadow-sm" : "bg-white border-slate-100 text-slate-500")}><span className="text-2xl font-black">{seconds}</span><span className="block text-[10px] font-bold mt-1">ثواني</span></button>)}
                </div>
                {renderPlaceLibrary()}
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(2)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={() => setReelStep(4)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button></div>
              </div>
            )}

            {reelStep === 4 && (
              <div className="space-y-4">
                {renderFineTools()}
                <div className="rounded-3xl bg-slate-950 text-white p-5"><div className="text-[11px] font-black text-white/45 mb-2">جاهز للتوليد</div><div className="text-lg font-black">{reelShots.find(s => s.id === reelShot)?.icon} {reelShots.find(s => s.id === reelShot)?.label}</div><div className="mt-2 text-sm font-bold text-white/60">9:16 · {reelDuration} ثواني · {KUWAIT_PLACES[selectedOrderPlace]?.label}</div></div>
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(3)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={generateReel} disabled={isGeneratingReel} className="p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isGeneratingReel ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />} ولّد الريل</button></div>
              </div>
            )}
          </div>

          <div className="rounded-[2.2rem] bg-slate-950 p-3 shadow-2xl border border-slate-900 min-h-[620px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            {!generatedReel && !isGeneratingReel && <div className="relative z-10 text-center text-white p-8"><div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-5xl shadow-2xl"><Film size={46} /></div><h3 className="text-3xl font-black mb-3">معاينة الريل تظهر هنا</h3><p className="text-sm font-bold text-white/55 leading-7">ريل عمودي واقعي · {reelDuration} ثواني</p></div>}
            {isGeneratingReel && <div className="relative z-10 text-center text-white p-8"><Loader2 className="mx-auto mb-5 animate-spin" size={46} /><p className="font-black">نولّد ريل واقعي...</p><p className="mt-3 text-xs font-bold text-white/45">نثبت الطعام ونحرك الكاميرا فقط</p></div>}
            {generatedReel && !isGeneratingReel && <div className="relative z-10 w-full max-w-[380px] space-y-4"><button type="button" onClick={() => setShowReelSettings((v) => !v)} className="w-full aspect-[9/16] rounded-[1.8rem] overflow-hidden bg-black border border-white/10 shadow-2xl relative group">{generatedReel.startsWith('data:image') ? <img src={generatedReel} className="w-full h-full object-contain bg-black" alt="ريل موشن" /> : <video src={generatedReel} className="w-full h-full object-contain bg-black" controls playsInline />}</button>{showReelSettings && <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-right text-white"><div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-xs font-black text-white/75">إعدادات هذا الريل</p><p className="text-[11px] font-bold text-white/45 mt-1">انسخها وكرر نفس الحركة لاحقاً.</p></div><button type="button" onClick={() => copyReelSettings()} className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-xs font-black flex items-center gap-1"><Copy size={14} /> نسخ</button></div><pre className="whitespace-pre-wrap rounded-2xl bg-black/20 border border-white/10 p-3 text-[11px] leading-6 font-bold text-white/80 text-right font-sans">{buildReelSettingsText()}</pre></div>}<div className="flex items-center justify-center gap-2"><button onClick={downloadReel} title="تحميل" aria-label="تحميل" className="h-12 w-12 rounded-2xl bg-violet-500 text-white flex items-center justify-center"><Download size={18} /></button><button type="button" onClick={() => copyReelSettings()} title="نسخ الإعدادات" aria-label="نسخ الإعدادات" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"><Copy size={18} /></button><button type="button" onClick={() => { setGeneratedReel(null); setReelStep(4); }} title="إعادة بنفس الأسلوب" aria-label="إعادة بنفس الأسلوب" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"><RotateCcw size={18} /></button></div></div>}
          </div>
        </div>
      )}

      {(studioTab === 'create' || studioTab === 'quick' || studioTab === 'whatsapp' || studioTab === 'occasions') && (
        <div className="grid lg:grid-cols-[390px_minmax(0,1fr)] gap-6 items-start">
          <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-5 text-right">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black text-indigo-500 mb-1">من فكرة</p>
                <h2 className="text-2xl font-black text-slate-900">صورة من فكرة</h2>
                <p className="text-sm font-bold text-slate-500 mt-2 leading-7">اختر المقاس المناسب، ثم اكتب فكرتك أو خلّ استوديو الصورة الذكية يقترح لك المسار.</p>
              </div>
            </div>

            {renderStageProgress(createStep, goCreateStep)}

            {createStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500">اختر المقاس المناسب</p>
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {formats.map((f) => (
                    <button key={f.id} onClick={() => setSelectedFormat(f.id)} className={cn("shrink-0 w-[118px] sm:w-auto sm:flex-1 p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all snap-center", selectedFormat === f.id ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-slate-100 text-slate-500") }>
                      {f.icon}<span className="text-[10px] font-black whitespace-nowrap">{f.sub}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => advanceCreateStep(2)} className="w-full p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Edit3 size={14} /> فكرتك</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={cn("rounded-2xl border p-3 text-xs font-black transition-all", customThemeQuery.trim() ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100")}>اكتب فكرة</button>
                    <button type="button" onClick={() => { setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); }} className={cn("rounded-2xl border p-3 text-xs font-black transition-all", !customThemeQuery.trim() ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-100")}>اختيارات جاهزة</button>
                  </div>
                  <input type="text" placeholder="اكتب وصف الصورة المطلوبة..." value={customThemeQuery} onChange={(e) => { setCustomThemeQuery(e.target.value); setSelectedTheme(e.target.value ? 'مخصص' : 'نبض الكويت'); }} className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-indigo-500" />
                  <p className="text-[11px] font-bold text-slate-400">اكتب وصفك ونختصر لك الطريق، أو اتركها فارغة للاقتراحات الجاهزة.</p>
                </div>
                {customThemeQuery.trim() ? <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs font-black text-indigo-700">اعتمدنا الفكرة. بعدها لمسات نهائية ثم التوليد.</div> : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs font-black text-slate-500">تبي اختيارات جاهزة؟ التالي يفتح لك المشهد والبيئة.</div>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => goCreateStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                  <button type="button" onClick={() => advanceCreateStep(customThemeQuery.trim() ? 5 : 3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">{customThemeQuery.trim() ? 'أدوات دقيقة' : 'المشهد'}</button>
                </div>
              </div>
            )}

            {createStep === 3 && (() => {
              const activeScene = mergedScenes.find(scene => {
                const isNationalDay = selectedPulseId === 'national-day';
                if (scene.id === 'national-day') {
                  return isNationalDay;
                }
                if (scene.id === 'home-delivery') {
                  return !isNationalDay && selectedOrderPlace === 'home';
                }
                return selectedOrderPlace === scene.place;
              }) || mergedScenes[0];

              return (
                <div className="space-y-4 text-right">
                  <p className="text-xs font-black text-slate-500 mb-2">المشهد والبيئة الحالية لقائمة الطعام والمنتجات:</p>
                  
                  {/* Trigger Header Button - Collapsed By Default */}
                  <button
                    type="button"
                    onClick={() => setShowCreateOccasion(!showCreateOccasion)}
                    className="w-full rounded-3xl border border-rose-200 bg-rose-50/70 p-4 text-right flex items-center justify-between hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer group shadow-sm outline-none select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-2.5 rounded-2xl bg-white border border-rose-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {activeScene.icon}
                      </div>
                      <div className="flex-1 text-right min-w-0 pr-1 select-none">
                        <span className="block text-[11px] font-black text-rose-500">مشهد الصورة</span>
                        <span className="block text-sm font-black text-rose-950 mt-0.5">{activeScene.label}</span>
                        <span className="block text-[10px] font-bold text-slate-500 mt-1 truncate">{activeScene.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-2xl text-[10px] font-black shadow-sm transition-all shrink-0">
                      <span>{showCreateOccasion ? 'إغلاق' : 'تغيير المشهد'}</span>
                      <ChevronLeft className={cn("transition-transform text-rose-400 w-3.5 h-3.5", showCreateOccasion ? "-rotate-90" : "")} />
                    </div>
                  </button>

                  {/* Collapsible List of Scenes - Closed By Default */}
                  <AnimatePresence>
                    {showCreateOccasion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 border border-slate-100/80 p-3 rounded-2xl mt-1">
                          {mergedScenes.map((scene) => {
                            const isSelected = selectedOrderPlace === scene.place && (scene.id === 'national-day' ? selectedPulseId === 'national-day' : selectedPulseId !== 'national-day');
                            return (
                              <button
                                key={scene.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPulseId(scene.id === 'farm-gathering' || scene.id === 'jakhour-setup' || scene.id === 'home-delivery' ? 'quick-kuwait' : scene.id);
                                  setSelectedOrderPlace(scene.place as any);
                                  setBackgroundPreset(scene.background as any);
                                  setRealityMode(scene.mode as any);
                                  setSelectedTheme('نبض الكويت');
                                  setShowCreateOccasion(false); // Close list after selection
                                }}
                                className={cn(
                                  "relative p-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer outline-none select-none",
                                  isSelected 
                                    ? "bg-rose-50 border-rose-400 shadow-sm ring-4 ring-rose-500/10 font-bold" 
                                    : "bg-white border-slate-100/50 hover:border-rose-200 hover:bg-slate-50"
                                )}
                              >
                                <span className="text-xl p-2 rounded-xl bg-slate-50 border border-slate-100/30 flex items-center justify-center shrink-0">
                                  {scene.icon}
                                </span>
                                <div className="flex-1 min-w-0 pr-1">
                                  <span className="block text-xs font-black text-slate-900">{scene.label}</span>
                                  <span className="block text-[10px] font-bold text-slate-400 mt-1 leading-normal">{scene.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button type="button" onClick={() => goCreateStep(2)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-colors">رجوع</button>
                    <button type="button" onClick={() => advanceCreateStep(5)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg hover:bg-slate-800 transition-colors">التالي</button>
                  </div>
                </div>
              );
            })()}

            {createStep === 5 && (
              <div className="space-y-4">
                {renderFineTools()}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => goCreateStep(customThemeQuery.trim() ? 2 : 3)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                  <button type="button" onClick={() => advanceCreateStep(6)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                </div>
              </div>
            )}

            {createStep === 6 && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-950 text-white p-5">
                  <div className="text-[11px] font-black text-white/45 mb-2">آخر مرحلة</div>
                  <div className="text-lg font-black">{activePulsePack.icon} {activePulsePack.label}</div>
                  <div className="mt-2 text-sm font-bold text-white/60">{KUWAIT_PLACES[selectedOrderPlace]?.label} · {selectedFormat}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => goCreateStep(5)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                  <button onClick={generateKuwaitNoProduct} disabled={isGenerating} className="p-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    ولّد الصورة
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2.2rem] bg-slate-950 p-3 shadow-2xl border border-slate-900 min-h-[560px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            {!generatedImage && !isGenerating && (
              <div className="relative z-10 text-center text-white p-8">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-6xl shadow-2xl">{activePulsePack.icon}</div>
                <h3 className="text-3xl font-black mb-3">المعاينة تظهر هنا</h3>
                <p className="text-sm font-bold text-white/55 leading-7">{activePulsePack.label} · {KUWAIT_PLACES[selectedOrderPlace]?.label}</p>
              </div>
            )}
            {isGenerating && <div className="relative z-10 text-center text-white p-8"><Loader2 className="mx-auto mb-5 animate-spin" size={46} /><p className="font-black">نجهز صورة واقعية...</p></div>}
            {generatedImage && !isGenerating && (
              <div className="relative z-10 w-full space-y-4">
                <button type="button" onClick={() => setShowImageSettings((v) => !v)} className={cn("w-full rounded-[1.6rem] overflow-hidden bg-white/5 border border-white/10 relative group", previewAspectClass)}>
                  {generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  ) : null}
                  <span className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                </button>
                {showImageSettings && (
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-right text-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-black text-white/75">إعدادات هذه الصورة</p>
                        <p className="text-[11px] font-bold text-white/45 mt-1">انسخها لتكرار نفس النتيجة لاحقاً.</p>
                      </div>
                      <div className="flex gap-2"><button type="button" onClick={startFreshImageUpload} className="rounded-2xl bg-white/10 border border-white/15 text-white px-4 py-2 text-xs font-black">رفع صورة جديدة</button><button type="button" onClick={copyCurrentSettings} className="rounded-2xl bg-white text-slate-950 px-4 py-2 text-xs font-black">نسخ الإعدادات</button></div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-2xl bg-black/20 border border-white/10 p-3 text-[11px] leading-6 font-bold text-white/80 text-right font-sans">{buildSettingsText()}</pre>
                  </div>
                )}
                {aiCaption && selectedContentGoal === 'whatsapp' && <div className="rounded-3xl bg-white/10 text-white p-4 shadow-lg border border-white/10"><p className="text-sm font-extrabold leading-7 whitespace-pre-wrap">{aiCaption}</p></div>}
                <div className="flex items-center justify-center gap-2">
                  {selectedContentGoal === 'whatsapp' && <button onClick={copyCaption} disabled={!aiCaption} title="نسخ" aria-label="نسخ" className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40"><MessageCircle size={18} /></button>}
                  <button onClick={handleDownload} title="تحميل" aria-label="تحميل" className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center"><Download size={18} /></button>
                  <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !generatedImage} title="اجعلها أصدق" aria-label="اجعلها أصدق" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40"><Sparkles size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {studioTab === 'product' && (
        <div className="grid lg:grid-cols-[390px_minmax(0,1fr)] gap-6 items-start">
          <input type="file" ref={productImageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-5 text-right">
            {!originalImage ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-indigo-500 mb-1">من صورة</p>
                    <h2 className="text-2xl font-black text-slate-950">ارفع صورة المنتج</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 leading-7">بعد الرفع نمر بخطوات قصيرة وواضحة قبل التوليد.</p>
                  </div>
                </div>
                <div onClick={() => productImageInputRef.current?.click()} className="w-full h-80 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-indigo-50 to-white rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-inner">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 shadow-sm transition-transform"><Camera className="w-10 h-10 text-indigo-600" /></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">ارفع صورة المنتج</h3>
                  <p className="text-slate-500 text-sm font-bold">JPG / PNG</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className="text-xs font-black text-indigo-500 mb-1">من صورة</p>
                    <h2 className="text-2xl font-black text-slate-950">تحسين صورة المنتج</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 leading-7">كل خطوة فيها قرار واحد فقط.</p>
                  </div>
                </div>

                {renderStageProgress(productStep, goProductStep)}

                {productStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-500">اختر المقاس المناسب</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {formats.map((f) => (
                        <button key={f.id} onClick={() => setSelectedFormat(f.id)} className={cn("shrink-0 w-[118px] sm:w-auto sm:flex-1 p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all snap-center", selectedFormat === f.id ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-slate-100 text-slate-500") }>
                          {f.icon}<span className="text-[10px] font-black whitespace-nowrap">{f.sub}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => advanceProductStep(2)} className="w-full p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                  </div>
                )}

                {productStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Edit3 size={14} /> فكرتك</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" className={cn("rounded-2xl border p-3 text-xs font-black transition-all", customThemeQuery.trim() ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100")}>اكتب فكرة</button>
                        <button type="button" onClick={() => { setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); }} className={cn("rounded-2xl border p-3 text-xs font-black transition-all", !customThemeQuery.trim() ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-100")}>اختيارات جاهزة</button>
                      </div>
                      <input type="text" placeholder="اكتب الجو أو المطلوب للصورة..." value={customThemeQuery} onChange={(e) => { setCustomThemeQuery(e.target.value); setSelectedTheme(e.target.value ? 'مخصص' : 'نبض الكويت'); }} className="w-full p-4 rounded-2xl border-2 text-sm text-right focus:outline-none border-slate-200 bg-white focus:border-indigo-500" />
                      <p className="text-[11px] font-bold text-slate-400">اكتب فكرتك وننتقل مباشرة للمسات النهائية، أو اتركها فارغة للاختيارات الجاهزة.</p>
                    </div>
                    {customThemeQuery.trim() ? <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs font-black text-indigo-700">اعتمدنا الفكرة. بعدها لمسات نهائية ثم التوليد.</div> : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs font-black text-slate-500">تبي اختيارات جاهزة؟ التالي يفتح لك المشهد والبيئة.</div>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => goProductStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button type="button" onClick={() => advanceProductStep(customThemeQuery.trim() ? 5 : 3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">{customThemeQuery.trim() ? 'أدوات دقيقة' : 'المشهد'}</button>
                    </div>
                  </div>
                )}

                {productStep === 3 && (() => {
                  const activeScene = mergedScenes.find(scene => {
                    const isNationalDay = selectedPulseId === 'national-day';
                    if (scene.id === 'national-day') {
                      return isNationalDay;
                    }
                    if (scene.id === 'home-delivery') {
                      return !isNationalDay && selectedOrderPlace === 'home';
                    }
                    return selectedOrderPlace === scene.place;
                  }) || mergedScenes[0];

                  return (
                    <div className="space-y-4 text-right">
                      <p className="text-xs font-black text-slate-500 mb-2">المشهد والبيئة الحالية لقائمة الطعام والمنتجات:</p>
                      
                      {/* Trigger Header Button - Collapsed By Default */}
                      <button
                        type="button"
                        onClick={() => setShowProductOccasion(!showProductOccasion)}
                        className="w-full rounded-3xl border border-rose-200 bg-rose-50/70 p-4 text-right flex items-center justify-between hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer group shadow-sm outline-none select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-3xl p-2.5 rounded-2xl bg-white border border-rose-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {activeScene.icon}
                          </div>
                          <div className="flex-1 text-right min-w-0 pr-1 select-none">
                            <span className="block text-[11px] font-black text-rose-500">مشهد الصورة</span>
                            <span className="block text-sm font-black text-rose-950 mt-0.5">{activeScene.label}</span>
                            <span className="block text-[10px] font-bold text-slate-500 mt-1 truncate">{activeScene.desc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-2xl text-[10px] font-black shadow-sm transition-all shrink-0">
                          <span>{showProductOccasion ? 'إغلاق' : 'تغيير المشهد'}</span>
                          <ChevronLeft className={cn("transition-transform text-rose-400 w-3.5 h-3.5", showProductOccasion ? "-rotate-90" : "")} />
                        </div>
                      </button>

                      {/* Collapsible List of Scenes - Closed By Default */}
                      <AnimatePresence>
                        {showProductOccasion && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 border border-slate-100/80 p-3 rounded-2xl mt-1">
                              {mergedScenes.map((scene) => {
                                const isSelected = selectedOrderPlace === scene.place && (scene.id === 'national-day' ? selectedPulseId === 'national-day' : selectedPulseId !== 'national-day');
                                return (
                                  <button
                                    key={scene.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPulseId(scene.id === 'farm-gathering' || scene.id === 'jakhour-setup' || scene.id === 'home-delivery' ? 'quick-kuwait' : scene.id);
                                      setSelectedOrderPlace(scene.place as any);
                                      setBackgroundPreset(scene.background as any);
                                      setRealityMode(scene.mode as any);
                                      setSelectedTheme('نبض الكويت');
                                      setShowProductOccasion(false); // Close list after selection
                                    }}
                                    className={cn(
                                      "relative p-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer outline-none select-none",
                                      isSelected 
                                        ? "bg-rose-50 border-rose-400 shadow-sm ring-4 ring-rose-500/10 font-bold" 
                                        : "bg-white border-slate-100/50 hover:border-rose-200 hover:bg-slate-50"
                                    )}
                                  >
                                    <span className="text-xl p-2 rounded-xl bg-slate-50 border border-slate-100/30 flex items-center justify-center shrink-0">
                                      {scene.icon}
                                    </span>
                                    <div className="flex-1 min-w-0 pr-1">
                                      <span className="block text-xs font-black text-slate-900">{scene.label}</span>
                                      <span className="block text-[10px] font-bold text-slate-400 mt-1 leading-normal">{scene.desc}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button type="button" onClick={() => goProductStep(2)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-colors">رجوع</button>
                        <button type="button" onClick={() => advanceProductStep(5)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg hover:bg-slate-800 transition-colors">التالي</button>
                      </div>
                    </div>
                  );
                })()}

                {productStep === 5 && (
                  <div className="space-y-4">
                    {renderFineTools()}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => goProductStep(customThemeQuery.trim() ? 2 : 3)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button type="button" onClick={() => advanceProductStep(6)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                    </div>
                  </div>
                )}

                {productStep === 6 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-slate-950 text-white p-5">
                      <div className="text-[11px] font-black text-white/45 mb-2">آخر مرحلة</div>
                      <div className="text-lg font-black">{activePulsePack.icon} {activePulsePack.label}</div>
                      <div className="mt-2 text-sm font-bold text-white/60">{KUWAIT_PLACES[selectedOrderPlace]?.label} · {selectedFormat}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => goProductStep(5)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button onClick={() => generateContent()} disabled={isGenerating || isGeneratingVariants} className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        توليد
                      </button>
                    </div>
                    <button type="button" onClick={generateFourRealityOptions} disabled={isGenerating || isGeneratingVariants || !selectedImage} className="w-full p-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                      {isGeneratingVariants ? <Loader2 className="animate-spin" size={20} /> : <Layout size={20} />}
                      4 نسخ واقعية
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full space-y-6 sticky top-4 z-40">
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[250px] md:min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden">
              {!generatedImage && !isGenerating && (
                <div className="text-center w-full max-w-lg mx-auto p-4 space-y-5">
                  <div className="w-full max-w-[260px] mx-auto aspect-square bg-white rounded-2xl border shadow-sm p-2 overflow-hidden flex items-center justify-center relative group">
                    {compressedImage || selectedImage || originalImage ? (
                      <>
                        <img src={compressedImage || selectedImage || originalImage} alt="Product" className="w-full h-full object-cover rounded-xl" />
                        <button type="button" onClick={() => productImageInputRef.current?.click()} className="absolute top-4 right-4 bg-slate-900/80 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-lg" title="تغيير الصورة">
                          <RotateCcw size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">بانتظار صورة المنتج</span>
                    )}
                  </div>
                  {compressedImage || selectedImage || originalImage ? (
                    <button type="button" onClick={() => productImageInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-full transition-colors mt-2">
                      <RotateCcw size={14} /> تغيير الصورة
                    </button>
                  ) : null}
                  {compressionSavedPercent !== null && (
                    <p className="-mt-3 text-[10px] font-medium text-emerald-600/80 tracking-tight">
                      {compressionSavedPercent > 0
                        ? `تم تحسين الصورة تلقائياً وتوفير ${compressionSavedPercent}% من حجمها مع الحفاظ على جودة مناسبة للنشر.`
                        : 'تم فحص الصورة وتحسينها تلقائياً مع الحفاظ على جودة مناسبة للنشر.'}
                    </p>
                  )}
                  {(isSuggestingScene || sceneSuggestion) && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-right">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-sm shrink-0">
                          {isSuggestingScene ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-emerald-700">
                            {isSuggestingScene ? 'نختار أنسب مشهد...' : `اعتمدنا ${KUWAIT_PLACES[sceneSuggestion?.place || 'delivery']?.label}`}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-emerald-900/70 leading-5">
                            {isSuggestingScene
                              ? 'نحلل نوع الطبق ونختار بيئة كويتية واقعية بدون قرارات إضافية.'
                              : sceneSuggestion?.reason || 'تم ضبط المكان والإضاءة والواقعية حسب الصورة.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <p className="text-sm text-indigo-900 font-bold">الصورة مرفوعة. كمّل الخطوات ثم اضغط توليد.</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="text-center px-6 py-12">
                  <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-indigo-500/30 shadow-2xl relative">
                    <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity }} className="relative z-10"><Sparkles className="w-12 h-12 text-white" /></motion.div>
                    <motion.div animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-indigo-500 rounded-3xl" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-6">نجهز صورة واقعية...</h3>
                  <div className="max-w-xs mx-auto space-y-4">
                    {["فهم تفاصيل الصورة الأصلية...", "بناء المشهد المناسب...", "ضبط الظلال والإضاءة...", "تنظيف التفاصيل المزعجة..."].map((step, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 1.5 }} className="flex items-center gap-3 text-right">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"><Check size={12} className="text-emerald-600" /></div>
                        <span className="text-sm font-bold text-slate-600">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {generatedImage && !isGenerating && (
                <div className="w-full h-full flex flex-col gap-5 p-4">
                  <div className="flex items-center justify-between mb-1 text-right">
                    <button type="button" onClick={startFreshImageUpload} className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-xs font-black shadow-sm">صورة ثانية</button>
                    <p className="text-sm font-bold text-indigo-600">الصورة الجاهزة</p>
                  </div>
                  <button type="button" onClick={() => setShowImageSettings((v) => !v)} className={cn("w-full bg-slate-50 rounded-3xl border shadow-2xl p-2 relative flex items-stretch overflow-hidden group mx-auto", previewAspectClass)}>
                    <div className="relative flex-1 w-full h-full rounded-2xl overflow-hidden">
                      {generatedImage ? (
                        <img src={generatedImage} alt="Generated" className="absolute inset-0 w-full h-full object-contain bg-slate-50" />
                      ) : null}
                    </div>
                    <span className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-[10px] font-black text-slate-600 shadow-sm border border-white/80 opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                  </button>

                  {showImageSettings && (
                    <div className="rounded-3xl border border-slate-100 bg-white p-4 text-right shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs font-black text-slate-500">إعدادات هذه الصورة</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">انسخها لتكرار نفس النتيجة لاحقاً.</p>
                        </div>
                        <div className="flex gap-2"><button type="button" onClick={startFreshImageUpload} className="rounded-2xl bg-slate-100 text-slate-700 px-4 py-2 text-xs font-black">رفع صورة جديدة</button><button type="button" onClick={copyCurrentSettings} className="rounded-2xl bg-slate-950 text-white px-4 py-2 text-xs font-black">نسخ الإعدادات</button></div>
                      </div>
                      <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 border border-slate-100 p-3 text-[11px] leading-6 font-bold text-slate-600 text-right font-sans">{buildSettingsText()}</pre>
                    </div>
                  )}

                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <button type="button" onClick={() => setShowBrandingPanel((v) => !v)} className="w-full rounded-2xl bg-white/70 border border-indigo-100 px-4 py-3 text-right flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-xs font-black text-indigo-700">هوية العلامة</span>
                        <span className="block text-[10px] font-bold text-indigo-400 mt-1">اختيارية بعد التوليد</span>
                      </span>
                      <ChevronLeft className={cn("transition-transform text-indigo-400", showBrandingPanel ? "-rotate-90" : "")} size={18} />
                    </button>
                    {showBrandingPanel && (
                      <div className="mt-3">
                        <BrandingControls useBranding={useBranding} setUseBranding={setUseBranding} brandingStyle={brandingStyle} setBrandingStyle={setBrandingStyle} logoPosition={logoPosition} setLogoPosition={setLogoPosition} logoOpacity={logoOpacity} setLogoOpacity={setLogoOpacity} customText={customText} setCustomText={setCustomText} textPosition={textPosition} setTextPosition={setTextPosition} colorClass="indigo" title="هوية العلامة" />
                      </div>
                    )}
                  </div>


                  {realityVariants.length > 0 && (
                    <div className="w-full rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black text-emerald-600">4 نسخ واقعية</span></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {realityVariants.map((item, idx) => (
                          <button key={`${item.label}-${idx}`} onClick={() => { setGeneratedImage(item.url); setAiImage(item.url); recordStudioTasteChoice({ mode: item.mode, background: item.background, theme: selectedTheme, format: selectedFormat, label: item.label, source: 'variant-picked' }); refreshStudioLearning(); }} className="group bg-white rounded-2xl border border-emerald-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all">
                            <img src={item.url} alt={item.label} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                            <div className="p-2 text-[10px] font-black text-slate-600 truncate">{item.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={handleDownload} title="تحميل" aria-label="تحميل" className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center"><Download size={18} /></button>
                    <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !selectedImage} title="اجعلها أصدق" aria-label="اجعلها أصدق" className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center disabled:opacity-50"><Sparkles size={18} /></button>
                    {generatedImage && (
                      <button type="button" onClick={() => { setReelSource('image'); setSelectedImage(generatedImage); setGeneratedReel(null); setShowReelSettings(false); setStudioTab('reel'); setReelStep(1); }} className="h-12 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs shadow-md transition-all animate-in fade-in"><Film size={16} /> حولها لريل</button>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 w-full flex flex-col items-center gap-3">
                    <p className="text-xs font-bold text-slate-500">حفظها داخل المنتج</p>
                    <div className="flex gap-2 w-full max-w-sm">
                      <select className="flex-1 p-3 border rounded-xl bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 outline-none text-right" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                        <option value="">اختر المنتج</option>
                        {data?.products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={handleSaveToProduct} disabled={!selectedProductId || isSaving} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ
                      </button>
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
