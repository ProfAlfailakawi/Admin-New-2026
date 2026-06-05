import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Download, Check, Save, Upload, X, Loader2, MousePointerSquareDashed, Zap, ChevronLeft, Layout, Edit3, Brain, Library, MessageCircle, Film, PlayCircle, Copy, RotateCcw } from 'lucide-react';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from '../constants';
import { toast } from 'sonner';
import { Product } from '../types';
import { cn } from '../lib/utils';
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
import { analyzeAlturathStudioIdea, getAlturathDishProfile, getAlturathProductGroups, getAlturathProductName, getAlturathProductSuggestions, type AlturathStudioBrainResult } from '../lib/alturathStudioBrain';

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
type StudioProductPickMode = 'smart' | 'manual';

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
  const [studioTab, setStudioTab] = useState<'home' | 'create' | 'quick' | 'whatsapp' | 'occasions' | 'product' | 'reel' | 'library' | 'advanced' | 'campaigner' | 'storyboard'>('home');
  const [createSubTab, setCreateSubTab] = useState<'custom' | 'campaigner'>('custom');
  const [reelSubTab, setReelSubTab] = useState<'generate' | 'storyboard'>('generate');
  const [menuOutputType, setMenuOutputType] = useState<'image' | 'reel'>('image');
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
  const [reelDuration, setReelDuration] = useState<number>(4);
  const [reelShot, setReelShot] = useState<string>('hero-push');
  const [reelSource, setReelSource] = useState<'idea' | 'image'>('idea');
  const [generatedReel, setGeneratedReel] = useState<string | null>(null);
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [showReelSettings, setShowReelSettings] = useState(false);
  const [openProductionDesk, setOpenProductionDesk] = useState<'image' | 'reel' | null>(null);
  const [showReelShotList, setShowReelShotList] = useState(false);
  const [showMenuRecipe, setShowMenuRecipe] = useState(false);
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
    { id: 'hero-push', label: 'اقتراب على الطلب', desc: 'الكاميرا تدخل بهدوء على الطبق مع ثبات كامل للأكل', icon: '🎥' },
    { id: 'box-open', label: 'فتح علبة التوصيل', desc: 'كشف واقعي لعلبة طلب نظيفة بدون يد معقدة', icon: '📦' },
    { id: 'table-pass', label: 'مرور على السفرة', desc: 'حركة جانبية هادئة على صينية أو عدة أطباق', icon: '🍽️' },
    { id: 'top-spread', label: 'من فوق السفرة', desc: 'لقطة top shot مرتبة للبيت أو الزوارة أو الطلبات الجماعية', icon: '⬇️' },
    { id: 'steam-close', label: 'بخار خفيف واقعي', desc: 'للطبق الحار فقط: بخار بسيط ولمعة طبيعية بدون مبالغة', icon: '♨️' },
    { id: 'texture-close', label: 'تفاصيل شهية قريبة', desc: 'قوام الرز/اللحم/السمك/ورق العنب بدون صوص طائر أو حركة غريبة', icon: '🔎' },
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

  interface SeasonCampaign {
    id: string;
    title: string;
    icon: string;
    seasonLabel: string;
    desc: string;
    place: KuwaitOrderPlace;
    background: StudioBackgroundPresetId;
    mood: string;
    pulseId: string;
    realityMode: StudioRealityMode;
    visualPromptAddition: string;
    soundscapeSuggestion: string;
  }

  interface StoryboardStep {
    step: string;
    title: string;
    shotName: string;
    camera: string;
    vibe: string;
    audio: string;
    duration: string;
  }

  const KUWAIT_SEASON_CAMPAIGNS: SeasonCampaign[] = [
    {
      id: 'winter-camp',
      title: 'موسم البر والكشتات والشتاء',
      icon: '⛺❄️',
      seasonLabel: 'شتاء الكويت (نوفمبر - فبراير)',
      desc: 'خلفية مخيمات شتوية برية هادئة أو شاليهات باردة مع بخار متصاعد دافئ وطعام ساخن يفتح الشهية.',
      place: 'chalet',
      background: 'jakhour-setup',
      mood: 'دافئ',
      pulseId: 'quick-kuwait',
      realityMode: 'finalBoss',
      visualPromptAddition: 'outdoor cozy Kuwaiti winter camping ground, soft warm glowing twilight bonfire bokeh in distant background, extreme high quality food photography of traditional steaming hot Kuwaiti food, gentle rising wisps of hot steam, authentic winter outdoor vibe.',
      soundscapeSuggestion: 'أصوات مفرقعات الحطب الهادئة في الخلفية مع نغمات عود برية'
    },
    {
      id: 'rainy-chill',
      title: 'أجواء المطر والغيم الكويتي',
      icon: '🌧️🍲',
      seasonLabel: 'أيام الغيم والمطر والمربعانية',
      desc: 'جلسة خارجية محمية عصرية، قطرات مطر على زجاج مبهر، بخار يتصاعد من أطباق المرق والقبوط الحارة.',
      place: 'farm',
      background: 'farm-gathering',
      mood: 'غروب',
      pulseId: 'quick-kuwait',
      realityMode: 'human',
      visualPromptAddition: 'outdoor sheltered Kuwaiti modern lounge during rain, soft moody rain overcast lighting, water droplets on table edge, steaming hot plate of delicious traditional Kuwaiti gravy food, rising hot evaporation mist, cozy afternoon weather.',
      soundscapeSuggestion: 'صوت هطول المطر اللطيف على النوافذ مع أداء مزمار هادئ'
    },
    {
      id: 'ramadan-nights',
      title: 'غبقات وجمعات ليالي رمضان',
      icon: '🌙✨',
      seasonLabel: 'شهر العبادة والخير والمناسبات السعيدة',
      desc: 'هوية بصرية ونقوش شعبية هادئة، فوانيس blur خفيفة بالخلفية، سفرة فطور ممتدة أو لقيمات وحلويات غبقة.',
      place: 'zowara',
      background: 'zowara-spread',
      mood: 'ناعم',
      pulseId: 'national-day',
      realityMode: 'menu',
      visualPromptAddition: 'luxurious traditional indoor Ramadan gathering table, soft defocused golden hanging lanterns in clean deep background, pristine heritage dish presentation, delicate warm interior illumination, premium Kuwaiti gather vibe.',
      soundscapeSuggestion: 'موسيقى شرقية روحية على أوتار القانون والناي البطيئة'
    },
    {
      id: 'national-spirit',
      title: 'الأعياد الوطنية ومناسبات الفرح',
      icon: '🇰🇼🎈',
      seasonLabel: 'فبراير الوطني والاحتفالات الشعبية',
      desc: 'زخارف راقية جداً غير مبالغ فيها، ألوان العلم بلمسات دقيقة (أشرطة أو تغليف فاخر)، إضاءة نهارية ساطعة وفرحة.',
      place: 'delivery',
      background: 'delivery-packaging',
      mood: 'دافئ',
      pulseId: 'national-day',
      realityMode: 'finalBoss',
      visualPromptAddition: 'festive clean Kuwaiti national celebration vibe, subtle beautiful modern decorations with minimal green, red, and white ribbons on premium gift bag, bright sunny morning light, cheerful and premium marketing photography.',
      soundscapeSuggestion: 'أغانٍ وطنية كلاسيكية ذات إيقاع حيوي مبهج ومحبب للجميع'
    },
    {
      id: 'summer-chalet',
      title: 'حر الصيف والمسابح والشاليه',
      icon: '🏖️☀️',
      seasonLabel: 'موسم الشاليهات المشرق والمنعش',
      desc: 'طاولة خشبية تحت مظلة بيضاء ناصعة، سماء زرقاء صافية بالخلفية، لقطة منعشة للمثلجات أو مشروبات الصيف والورق عنب.',
      place: 'chalet',
      background: 'chalet-spread',
      mood: 'دافئ',
      pulseId: 'quick-kuwait',
      realityMode: 'finalBoss',
      visualPromptAddition: 'bright summery pool-side setting at a modern Kuwaiti sea-side chalet, pure blue skies defocused, cool shade under white umbrella, fresh appetising dishes on a clean table.',
      soundscapeSuggestion: 'أصوات أمواج بحر هادئة ونغمات صيفية منعشة مبهجة'
    }
  ];

  const getStoryboardStepsForProduct = (name: string): StoryboardStep[] => {
    const productName = name.trim() || 'طبقك الكويتي الفاخر';
    return [
      {
        step: '01',
        title: 'اللقطة الافتتاحية (The Hook)',
        shotName: `سحب وقريب جداً (Macro Zoom-In) على تفاصيل مظهر ${productName}`,
        camera: 'حركة كاميرا بطيئة ومنزلقة تدخل لعمق الصحن بزاوية ٤٥ درجة مع تركيز بؤري حاد.',
        vibe: 'بخار ساخن يتصاعد بشكل طبيعي يبين حرارة الطعام الطازج، اللمعان يسحر العين.',
        audio: 'أصوات دافئة لأوتار عود كويتية عريقة مع صوت دلة هادئ في الخلفية كخافت باهت.',
        duration: '٢.٥ ثانية'
      },
      {
        step: '02',
        title: 'لقطة التفاصيل والشهية (The Sensory Climax)',
        shotName: 'حركة دائرية هادئة (Smooth Orbital Rotation) حول قطع اللحم/الدجاج/الأرز',
        camera: 'دوران بطيء بزاوية منخفضة يبرز النضارة والنكهة والزعفران وحبات الرز المكتملة.',
        vibe: 'عناصر الطبق واضحة وجاذبة، إضاءة شمس كويتية دافئة تبرز الألوان المبهجة.',
        audio: 'إيقاع تصفيق كويتي خفيف ومنظم يبني متعة وترقّب للطبق بانسجام تام.',
        duration: '٣ ثواني'
      },
      {
        step: '03',
        title: 'لقطة وصول العلة والعلامة (The Brand Outro)',
        shotName: 'تكبير تراجعي (Dolly Zoom Out) يظهر التغليف وصناديق التوصيل الفخمة',
        camera: 'لقطة تسحب للخلف بثبات على كاونتر أبيض فاخر بجنب كيس plain أنيق للشعار.',
        vibe: 'توصيل يبيض الوجه، دقة تنظيف عالية تضمن أمان وثقة الجودة للمستلم.',
        audio: 'خفوت تدريجي للنغمات مع شعار العلامة في آخر لقطة لترسيخ الذاكرة.',
        duration: '٢ ثواني'
      }
    ];
  };

  const mergedScenes = [
    { id: 'delivery-ready', label: 'طلب توصيل جاهز', desc: 'علب مرتبة وكيس plain على كاونتر نظيف؛ أقوى خيار افتراضي', icon: '📦', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'box-reveal', label: 'فتح علبة الطلب', desc: 'كشف بسيط للطبق داخل التغليف بدون يد معقدة أو فوضى', icon: '📦', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'home-rice-tray', label: 'صينية عيوش للبيت', desc: 'مجبوس/مربين/عيش وسمك على سفرة بيتية مرتبة', icon: '🏠', place: 'home', mode: 'finalBoss', background: 'home-table' },
    { id: 'diwaniya-order', label: 'طلب ديوانية للربع', desc: 'طلب جماعي مرتب بخلفية ديوانية blur بدون وجوه أو ديكور مصطنع', icon: '🛋️', place: 'diwaniya', mode: 'human', background: 'diwaniya-table' },
    { id: 'zowara-spread', label: 'سفرة زوارة', desc: 'محاشي/ورق عنب/أطباق عائلية جاهزة للتقديم داخل بيت', icon: '👨‍👩‍👧‍👦', place: 'zowara', mode: 'menu', background: 'zowara-spread' },
    { id: 'chalet-weekend-order', label: 'طلب الشاليه', desc: 'طلبات ويكند مرتبة على طاولة بسيطة بإضاءة نهارية أو غروب ناعم', icon: '🌊', place: 'chalet', mode: 'human', background: 'chalet-spread' },
    { id: 'farm-clean-table', label: 'طلب المزرعة', desc: 'طاولة خارجية نظيفة تحت ظل طبيعي؛ بدون خيم وزخارف مبالغ فيها', icon: '🌴', place: 'farm', mode: 'human', background: 'farm-gathering' },
    { id: 'jakhour-clean-order', label: 'طلب الجاخور', desc: 'قعدة عملية نظيفة للربع بخلفية هادئة؛ بدون حيوانات أو تراب أو فوضى', icon: '🐪', place: 'jakhour', mode: 'human', background: 'jakhour-setup' },
    { id: 'food-detail', label: 'تفاصيل الطبق', desc: 'لقطة قريبة للرز أو السمك أو اللحم أو ورق العنب مع ثبات كامل', icon: '🔎', place: 'delivery', mode: 'finalBoss', background: 'neutral-menu' },
  ];



  const inferStudioChoicesFromText = (rawValue: string) => {
    const brain = analyzeAlturathStudioIdea(rawValue, data?.products || []);
    if (!brain.hasInput) return;

    const scene = mergedScenes.find((item) => item.id === brain.sceneId) || mergedScenes[0];
    setSelectedSceneId(scene.id);
    setSelectedPulseId(brain.pulseId);
    setSelectedOrderPlace(scene.place as KuwaitOrderPlace);
    setBackgroundPreset(scene.background as StudioBackgroundPresetId);
    setRealityMode(scene.mode as StudioRealityMode);
    setSelectedMood(brain.mood);
    setRealityBoost(true);
    setStrictPlateLock(true);
    setReelShot(brain.shotId);
  };


  const handleStudioIdeaChange = (value: string) => {
    setCustomThemeQuery(value);
    setSelectedTheme(value.trim() ? 'مخصص' : 'نبض الكويت');
    inferStudioChoicesFromText(value);
  };

  const FORBIDDEN_STUDIO_WORDS = ['دلة', 'دلال', 'مبخر', 'مباخر', 'بخور', 'عود', 'سدو', 'فانوس', 'فوانيس', 'قهوة', 'قهوت', 'بن', 'فنجان', 'فناجين', 'كلينكس', 'منديل مستخدم', 'مناديل مستخدمة', 'منديل وصخ', 'مناديل وصخة', 'مخلفات'];
  const sanitizeStudioPrompt = (value: string) =>
    FORBIDDEN_STUDIO_WORDS.reduce((text, word) => text.replace(new RegExp(word, 'g'), ''), String(value || ''))
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([،.])/g, '$1')
      .trim();
  const STUDIO_SYMBOL_NEGATIVE_PROMPT = 'STRICT SYMBOL BAN: no crosses, no cross-shaped objects, no crucifix, no statues, no idols, no figurines, no religious icons, no shrine-like decor, no temple/church/mosque symbols, no symbolic worship objects. ممنوع ظهور أي صليب أو شكل يشبه الصليب، ممنوع الأصنام أو التماثيل أو المجسمات أو الرموز الدينية.';
  const STUDIO_NEGATIVE_PROMPT = `${STUDIO_REALITY_NEGATIVE_PROMPT} ${STUDIO_SYMBOL_NEGATIVE_PROMPT}`;
  const ensureAlturathProductOnly = (options?: { imageOnly?: boolean }) => {
    const products = data?.products || [];
    const imageOnly = Boolean(options?.imageOnly);
    const selectedManualProduct = imageOnly ? undefined : products.find((p: Product) => String(p.id) === String(selectedStudioProductId));
    if (!imageOnly && studioProductPickMode === 'manual' && !selectedManualProduct) {
      toast.error('اختر منتجًا من قائمتك أولًا، أو ارجع إلى الاختيار الذكي.');
      return null;
    }
    const selectedProductName = selectedManualProduct ? getAlturathProductName(selectedManualProduct) : '';
    const brainInput = imageOnly ? customThemeQuery : (selectedProductName ? `${customThemeQuery} ${selectedProductName}`.trim() : customThemeQuery);
    const brain = analyzeAlturathStudioIdea(brainInput, products);
    if (!brain.canGenerate) {
      toast.error(brain.productGuardMessage);
      return null;
    }
    if (!imageOnly && brain.strictProductOnlyMode && brain.hasInput && !brain.isKnownProduct && brain.productSuggestions.length > 0) {
      toast.info('تم اختيار المنتج بذكاء من قائمة مطبخك بما يناسب الفكرة.');
    }
    return brain;
  };


  const [customThemeQuery, setCustomThemeQuery] = useState('');
  const [studioProductPickMode, setStudioProductPickMode] = useState<StudioProductPickMode>('smart');
  const [selectedStudioCategoryId, setSelectedStudioCategoryId] = useState<string>('');
  const [selectedStudioProductId, setSelectedStudioProductId] = useState<string>('');
  const [showStudioProductPicker, setShowStudioProductPicker] = useState(false);
  const [selectedPulseId, setSelectedPulseId] = useState<string>('quick-kuwait');
  const [selectedSceneId, setSelectedSceneId] = useState<string>('delivery-ready');
  
  // Use a lazy initializer or just assume initial info since getKuwaitPulsePack exists
  const [selectedOrderPlace, setSelectedOrderPlace] = useState<KuwaitOrderPlace>('delivery');
  const [selectedContentGoal, setSelectedContentGoal] = useState<KuwaitContentGoal>('product');
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [productStudioFlow, setProductStudioFlow] = useState<ProductStudioFlow>('quick');
  const [selectedMood, setSelectedMood] = useState('دافئ');
  const [realityMode, setRealityMode] = useState<StudioRealityMode>('finalBoss');
  const [backgroundPreset, setBackgroundPreset] = useState<StudioBackgroundPresetId>('delivery-packaging');
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
  const [studioGenerationMemory, setStudioGenerationMemory] = useState<string[]>([]);
  const [studioAvoidedSignatures, setStudioAvoidedSignatures] = useState<string[]>([]);


  const refreshStudioLearning = async () => {
    setTasteMemoryPrompt(buildStudioTastePrompt());
    const library = await loadStudioBackgroundLibrary();
    setBackgroundLibrary(library);
  };

  useEffect(() => {
    refreshStudioLearning();
    try {
      const memory = JSON.parse(localStorage.getItem('alturath_studio_generation_memory') || '[]');
      const avoided = JSON.parse(localStorage.getItem('alturath_studio_avoid_signatures') || '[]');
      setStudioGenerationMemory(Array.isArray(memory) ? memory.slice(0, 10) : []);
      setStudioAvoidedSignatures(Array.isArray(avoided) ? avoided.slice(0, 20) : []);
    } catch {
      setStudioGenerationMemory([]);
      setStudioAvoidedSignatures([]);
    }
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
  const activeStudioScene = mergedScenes.find((scene) => scene.id === selectedSceneId) || mergedScenes[0];
  const activeSceneSummary = `${activeStudioScene.icon} ${activeStudioScene.label}`;

  const studioSignatureLabel = (signature: string) => signature.split('|').filter(Boolean).join(' · ');

  const pushStudioMemory = (signature: string, kind: 'generated' | 'avoid' = 'generated') => {
    const clean = String(signature || '').trim();
    if (!clean) return;
    if (kind === 'avoid') {
      setStudioAvoidedSignatures(prev => {
        const next = [clean, ...prev.filter(item => item !== clean)].slice(0, 20);
        try { localStorage.setItem('alturath_studio_avoid_signatures', JSON.stringify(next)); } catch {}
        return next;
      });
      return;
    }
    setStudioGenerationMemory(prev => {
      const next = [clean, ...prev.filter(item => item !== clean)].slice(0, 10);
      try { localStorage.setItem('alturath_studio_generation_memory', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const buildStudioSignature = (productName?: string) => {
    const shotLabel = reelShots.find(s => s.id === reelShot)?.label || reelShot;
    const product = productName || customThemeQuery.trim() || activeStudioScene.label;
    return [product, activeStudioScene.label, shotLabel, KUWAIT_PLACES[selectedOrderPlace]?.label || selectedOrderPlace].filter(Boolean).join('|');
  };

  const buildNoRepeatDirection = () => {
    const combined = [...studioAvoidedSignatures, ...studioGenerationMemory].filter(Boolean).slice(0, 8);
    if (!combined.length) return '';
    return `تنويع إلزامي: لا تكرر التكوينات أو زوايا التصوير أو الخلفيات القريبة من آخر اختيارات الاستوديو: ${combined.map(studioSignatureLabel).join(' / ')}. حافظ على المنتج المختار نفسه إن وجد، لكن غيّر زاوية الإخراج أو ترتيب الخلفية أو عمق اللقطة بواقعية.`;
  };

  const buildDirectorDirection = (brain?: AlturathStudioBrainResult) => {
    const activeShot = reelShots.find(s => s.id === reelShot);
    const productName = selectedStudioProductName || brain?.primaryProductName || brain?.categoryLabel || customThemeQuery.trim();
    return [
      `مخرج التراث: المنتج/الفكرة=${productName || 'اختيار ذكي'}، المشهد=${activeStudioScene.label}، اللقطة=${activeShot?.label || reelShot}، المكان=${KUWAIT_PLACES[selectedOrderPlace]?.label || selectedOrderPlace}.`,
      `اختبار الواقعية الكويتية: الصورة يجب أن تبدو كطلب مطبخ كويتي حقيقي للتوصيل أو البيت، لا إعلان فندقي ولا مطعم جلوس ولا ديكور تراثي مصطنع.`,
      `اختبار البيع: المنتج واضح أولاً، الكمية مقنعة، التغليف/السفرة نظيف، ولا توجد عناصر تسرق الانتباه من الطبق.`
    ].join(' ');
  };

  const buildAdvancedStudioDirection = (brain?: AlturathStudioBrainResult, options?: { source?: 'idea' | 'image' | 'reel' }) => {
    const productName = selectedStudioProductName || brain?.primaryProductName || customThemeQuery.trim();
    const profile = getAlturathDishProfile(productName || customThemeQuery || activeStudioScene.label, data?.products || []);
    const isMenuPhoto = selectedContentGoal === 'product' || realityMode === 'menu' || backgroundPreset === 'neutral-menu';
    const source = options?.source || (selectedImage ? 'image' : 'idea');
    return [
      profile.fingerprint,
      profile.identityLock,
      profile.portionRule,
      profile.deliverySuitability.prompt,
      profile.clutterRisk.prompt,
      profile.truthBiasHint,
      profile.brandStyleHint,
      isMenuPhoto ? profile.menuModeHint : '',
      source === 'image'
        ? 'Original image match mode: preserve the uploaded image identity strongly. Do not turn a delivery box into a luxury spread, do not turn a simple plate into a feast, and do not replace the visible food.'
        : 'Text-to-image truth order: food identity first, realism second, delivery/menu clarity third, beauty fourth, creativity last.',
      'Dish-transform blocker: never let the scene, lighting, or aesthetic override the actual product identity. No protein swap, no recipe swap, no side-item invention, no decorative clutter.'
    ].filter(Boolean).join(' ');
  };

  const markCurrentStyleAsAvoided = () => {
    const signature = buildStudioSignature(selectedStudioProductName || currentStudioBrain.primaryProductName);
    pushStudioMemory(signature, 'avoid');
    toast.success('تم. لن نكرر هذا الأسلوب.');
  };

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

    // Synchronize selectedSceneId so the UI reflects the suggested scene
    const matchingScene = mergedScenes.find(s => 
      s.place === place && 
      s.background === (suggestion.background || KUWAIT_PLACES[place].background)
    ) || mergedScenes.find(s => s.place === place) || mergedScenes[0];
    
    setSelectedSceneId(matchingScene.id);
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
      setShowReelShotList(false);
      recommendSceneFromImage(result.base64);
      toast.success('تم تجهيز الصورة كمصدر للريل');
    };
    reader.readAsDataURL(file);
  };

  const generateContent = async (variantOverride?: { mode?: StudioRealityMode; background?: StudioBackgroundPresetId; label?: string; sourceImage?: string }) => {
    const sourceImage = variantOverride?.sourceImage || selectedImage;
    if (!sourceImage) return;
    const productBrain = ensureAlturathProductOnly({ imageOnly: true });
    if (!productBrain) return;
    const imageBrain = analyzeAlturathStudioIdea(customThemeQuery, data?.products || []);
    const themeText = sanitizeStudioPrompt(buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: selectedTheme === 'مخصص' ? customThemeQuery : `${selectedTheme}. ${customThemeQuery}`,
      products: data?.products
    }));
    const studioDirection = sanitizeStudioPrompt(`${buildDirectorDirection(imageBrain)} ${buildAdvancedStudioDirection(imageBrain, { source: 'image' })} ${buildNoRepeatDirection()}`);

    setIsGenerating(true);
    setGeneratedImage(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setRealityAudit(null);

    // Call backend API to process the realistic image
    try {
      const response = await fetch('/api/smart-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: sourceImage.split(',')[1],
          mimeType: sourceImage.split(';')[0].split(':')[1],
          format: selectedFormat,
          theme: `${themeText}. ${studioDirection}. ${productBrain.promptGuard}. ${STUDIO_NEGATIVE_PROMPT}`,
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
        pushStudioMemory(buildStudioSignature(imageBrain.primaryProductName || selectedStudioProductName));
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
    const productBrain = ensureAlturathProductOnly();
    if (!productBrain) return;
    const ideaBrain = analyzeAlturathStudioIdea(customThemeQuery, data?.products || []);
    const themeText = sanitizeStudioPrompt(buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: customThemeQuery || activeStudioScene.label,
      products: data?.products
    }));
    const studioDirection = sanitizeStudioPrompt(`${buildDirectorDirection(ideaBrain)} ${buildAdvancedStudioDirection(ideaBrain, { source: 'idea' })} ${buildNoRepeatDirection()}`);
    setIsGenerating(true);
    setGeneratedImage(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setRealityAudit(null);
    try {
      const prompt = `${themeText}
${studioDirection}
${ideaBrain.promptGuard}
Generate a believable Kuwaiti occasion / delivery / gathering image without requiring a product upload. Make it look like a real photographed Kuwaiti order moment, suitable for menu/social/product use. No readable text inside the image. ${STUDIO_NEGATIVE_PROMPT}`;
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
      setPreviousAiCaption(aiCaption);
      setAiCaption(null);
      addToHistory(branded, null, { mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, source: 'idea' });
      pushStudioMemory(buildStudioSignature(ideaBrain.primaryProductName || selectedStudioProductName));
      recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, label: 'kuwait-no-product', source: 'quick-no-product' });
      refreshStudioLearning();
      toast.success('تم تجهيز الصورة');
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
    const sourceImage = selectedImage || aiImage || generatedImage;
    if (!sourceImage || isGenerating || isGeneratingVariants) return;
    setRealityMode('finalBoss');
    const hint = realityAudit?.fixHint || 'أصدق من أجمل: حافظ على هوية الطبق والكمية والملمس أولاً، خفف الزخرفة، اجعل الخلفية أبسط وأكثر بشرية وكويتية، ظلال صحيحة، إضاءة أقل مثالية، لا لمعان زائد، لا عمق مبالغ، لا ديكور وهمي.';
    await generateContent({ mode: 'finalBoss', background: backgroundPreset || 'wood-table', label: `أصدق بصرياً: ${hint}`, sourceImage });
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
    toast.success('تم حفظ ذوقك لهذا الأسلوب — استوديو التراث الذكي راح يفضله لاحقاً');
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
    // Disabled captioning as explicitly requested: الغي اي كابتشن
    setAiCaption(null);
    return;
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
    const brain = analyzeAlturathStudioIdea(customThemeQuery, data?.products || []);
    const place = KUWAIT_PLACES[selectedOrderPlace] || KUWAIT_PLACES.delivery;
    const idea = customThemeQuery.trim() || `${activeStudioScene.label} لطلب كويتي واقعي من مطبخ التراث الكويتي`;
    const shotGuide: Record<string, string> = {
      'hero-push': 'حركة push-in بطيئة على الطبق، لا تغيّر ترتيب الطعام ولا تضف عناصر جديدة.',
      'box-open': 'علبة توصيل plain تُفتح أو تُكشف بشكل بسيط؛ اليد إن ظهرت تكون جزئية وطبيعية جداً، بدون أصابع غريبة.',
      'table-pass': 'حركة جانبية قصيرة على سفرة أو صينية مرتبة؛ الأطباق ثابتة ولا تظهر صحون جديدة فجأة.',
      'top-spread': 'لقطة من الأعلى لسفرة مرتبة، حركة خفيفة جداً أو zoom بسيط، مناسبة للطلبات الجماعية.',
      'steam-close': 'بخار خفيف فقط إذا الطبق حار؛ لا تستخدمه للحلويات أو ورق العنب البارد أو التغليف.',
      'texture-close': 'لقطة قريبة للملمس: رز، لحم، سمك، محاشي أو ورق عنب؛ بدون سكب صوص أو حركة سوائل غير منطقية.'
    };
    const placeGuide: Record<string, string> = {
      delivery: 'مشهد توصيل هو الافتراضي: علب مرتبة وكيس plain على كاونتر أو طاولة نظيفة، بدون سيارة أو سائق أو شعارات.',
      home: 'سفرة بيتية كويتية بسيطة: طبق أو صينية على طاولة عادية، كوب ماء بسيط مسموح، بدون قهوة أو دلة أو بخور.',
      diwaniya: 'ديوانية عصرية blur: طلب جماعي للربع، بدون وجوه واضحة، بدون دخان، بدون سدو أو ديكور تراثي مصطنع.',
      chalet: 'شاليه كويتي واقعي: طاولة بسيطة وضوء نهاري أو غروب، بدون ناس واضحة أو بحر مبالغ أو مشهد سياحي.',
      farm: 'مزرعة نظيفة وهادئة: طاولة خارجية تحت ظل طبيعي، بدون خيام تراثية أو فوضى أو ديكور زائد.',
      jakhour: 'جاخور مرتب وحذر: طاولة عملية نظيفة وخلفية blur، بدون حيوانات أو تراب أو مخلفات أو فوضى.',
      zowara: 'زوارة عائلية داخل بيت: سفرة مرتبة ومحاشي/ورق عنب/أطباق عائلية، بدون وجوه أو عرس أو قهوة.'
    };
    return `Reel عمودي 9:16 احترافي لمطبخ التراث الكويتي، نشاط مطبخ وتوصيل أكل كويتي وليس مطعم جلوس. فكرة مختصرة: ${idea}. نوع اللقطة: ${shot?.label || 'اقتراب على الطلب'} — ${shotGuide[reelShot] || shotGuide['hero-push']}. المكان: ${place.label} — ${placeGuide[selectedOrderPlace] || placeGuide.delivery}. ${buildDirectorDirection(brain)} ${buildAdvancedStudioDirection(brain, { source: 'reel' })} ${buildNoRepeatDirection()} مدة ${Math.min(8, Math.max(4, reelDuration))} ثواني. المطلوب لقطة واحدة واقعية جداً، حركة كاميرا ناعمة وثابتة، الطعام واضح ومثبت في المنتصف، لا يتغير شكل الطبق أو الكمية أو المكونات عبر الفيديو. حافظ على الطبق والتغليف كما هما إذا كان المصدر صورة. تكوين بصري نظيف وإضاءة شهية واقعية. ممنوع وجوه واضحة، شخص يتكلم، شفاه، نصوص، شعارات، دلة، قهوة، بخور، سدو، فوانيس، سيارة توصيل، مطعم جلوس، كافيه، كلينكس مستخدم، فوضى، صحون تظهر فجأة، صوص يطير، أو أي حركة غير منطقية. إضاءة ${selectedMood}. وصفة الريل الذكية حسب الطبق: ${brain.reelRecipe.join('، ')}. ${brain.promptGuard}`;
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

  const renderProductionDesk = (mode: 'image' | 'reel') => {
    const isOpen = openProductionDesk === mode;
    return (
      <div className="absolute bottom-3 right-3 z-30 text-right" dir="rtl">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenProductionDesk((current) => current === mode ? null : mode);
          }}
          className="h-9 w-9 rounded-2xl border border-white/15 bg-slate-950/80 text-white/90 shadow-xl backdrop-blur-xl flex items-center justify-center text-[13px] font-black hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label={isOpen ? 'إخفاء تفاصيل الإنتاج' : 'إظهار تفاصيل الإنتاج'}
          title={isOpen ? 'إخفاء تفاصيل الإنتاج' : 'إظهار تفاصيل الإنتاج'}
        >
          i
        </button>

        {isOpen && (
          <aside className="absolute bottom-11 right-0 w-[min(17rem,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-2xl">
            <div className="mb-2 flex items-center justify-between gap-3" dir="ltr">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">{mode === 'reel' ? 'Reel Desk' : 'Production Desk'}</span>
              <strong className="rounded-xl bg-white/10 px-2 py-1 text-xs font-black text-white">{mode === 'reel' ? '9:16' : selectedFormat}</strong>
            </div>
            <div className="space-y-1.5 text-[11px] font-bold leading-5 text-white/75">
              <div className="truncate">المشهد: {activeStudioScene.label}</div>
              <div className="truncate">المكان: {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>
              <div className="truncate">الواقعية: {STUDIO_REALITY_MODES[realityMode]?.label || 'واقعي'}</div>
              <div className="truncate">الخلفية: {backgroundPreset}</div>
              {mode === 'reel' && <div className="truncate">المدة: {reelDuration} ثواني</div>}
            </div>
          </aside>
        )}
      </div>
    );
  };

  const generateReel = async () => {
    const productBrain = ensureAlturathProductOnly({ imageOnly: reelSource === 'image' });
    if (!productBrain) return;
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
        duration: Math.min(8, Math.max(4, reelDuration)),
        shotType: reelShot,
        format: '9:16',
        resolution: '540x960',
        targetResolution: '540x960',
        quality: 'economy',
        renderMode: 'balanced-economy',
        compression: 'balanced',
        bitrate: '1200k',
        fps: 24,
        audio: false,
        voiceover: false,
        noTalking: true,
        tokenBudget: 'low',
        place: selectedOrderPlace,
        mood: selectedMood,
        tasteProfile: buildStudioTastePrompt(),
        productOnlyGuard: productBrain.promptGuard,
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
        duration: Math.min(8, Math.max(4, reelDuration)),
        shot: reelShot,
        source: reelSource,
        format: '9:16',
        idea: customThemeQuery.trim(),
        place: selectedOrderPlace,
        mood: selectedMood
      };
      setReelHistory(prev => [item, ...prev.filter(r => r.url !== item.url)].slice(0, 18));
      pushStudioMemory(buildStudioSignature(productBrain.primaryProductName || selectedStudioProductName));
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

  const studioProducts: Product[] = data?.products || [];
  const studioProductGroups = getAlturathProductGroups(studioProducts);
  const activeStudioCategoryId = selectedStudioCategoryId || studioProductGroups[0]?.id || '';
  const activeStudioCategoryProducts = studioProductGroups.find(group => group.id === activeStudioCategoryId)?.products || [];
  const selectedStudioProduct = studioProducts.find((p: Product) => String(p.id) === String(selectedStudioProductId));
  const selectedStudioProductName = selectedStudioProduct ? getAlturathProductName(selectedStudioProduct) : '';
  const effectiveStudioBrainText = selectedStudioProductName ? `${customThemeQuery} ${selectedStudioProductName}`.trim() : customThemeQuery;
  const currentStudioBrain = analyzeAlturathStudioIdea(effectiveStudioBrainText, studioProducts);
  const productSuggestions = getAlturathProductSuggestions(studioProducts, customThemeQuery, 8);

  const calculateStudioMatch = (brain: AlturathStudioBrainResult, hasImageSource = false) => {
    const hasWrittenIdea = customThemeQuery.trim().length >= 3;
    const hasSelectedProduct = !hasImageSource && Boolean(selectedStudioProductName);
    const hasImageAnalysis = Boolean(sceneSuggestion?.productType || sceneSuggestion?.reason);

    if (!hasWrittenIdea && !hasSelectedProduct && !hasImageAnalysis) return null;

    let score = 54;
    if (hasSelectedProduct) score += 22;
    else if (brain.isKnownProduct) score += 18;
    else if (brain.productSuggestions.length > 0) score += 8;

    if (brain.category !== 'generic') score += 10;
    if (hasWrittenIdea) score += Math.min(8, Math.floor(customThemeQuery.trim().length / 10));
    if (hasImageSource && hasImageAnalysis) score += 12;
    if (selectedSceneId === brain.sceneId) score += 5;
    if (reelShot === brain.shotId) score += 4;
    if (brain.canGenerate) score += 4;
    if (brain.requiresProductSelection) score -= 18;

    const maxScore = hasSelectedProduct || brain.isKnownProduct ? 94 : hasImageAnalysis ? 86 : brain.category === 'generic' ? 74 : 84;
    const minScore = brain.requiresProductSelection ? 48 : 62;
    const value = Math.max(minScore, Math.min(maxScore, score));

    return {
      value,
      label: brain.requiresProductSelection ? 'مطابقة منخفضة' : `مطابقة ${value}%`
    };
  };

  const calculateSalesReadiness = (brain: AlturathStudioBrainResult, matchValue?: number | null) => {
    const profile = getAlturathDishProfile(selectedStudioProductName || brain.primaryProductName || customThemeQuery, studioProducts);
    let score = typeof matchValue === 'number' ? matchValue : 68;
    if (selectedSceneId.includes('delivery') || selectedOrderPlace === 'delivery') score += 4;
    if (['steam-close', 'texture-close', 'box-open', 'top-spread'].includes(reelShot)) score += 4;
    if (brain.category !== 'generic') score += 5;
    score += Math.round((profile.deliverySuitability.value - 80) / 4);
    score += Math.round((profile.clutterRisk.value - 80) / 6);
    if (studioGenerationMemory.includes(buildStudioSignature(brain.primaryProductName || selectedStudioProductName))) score -= 6;
    return Math.max(50, Math.min(96, Math.round(score)));
  };

  const renderAlturathBrainCard = (context: 'image' | 'reel' = 'image') => {
    const hasImageSource = Boolean(selectedImage) && (context === 'image' || context === 'reel');
    const brain: AlturathStudioBrainResult = hasImageSource ? analyzeAlturathStudioIdea(customThemeQuery, studioProducts) : currentStudioBrain;
    const activeScene = mergedScenes.find(scene => scene.id === selectedSceneId) || mergedScenes[0];
    const activeShot = reelShots.find(shot => shot.id === reelShot) || reelShots[0];
    const imageIdeaLabel = sceneSuggestion?.productType || (isSuggestingScene ? 'نقرأ الصورة الآن' : 'صورة مرفوعة');
    const smartSelectionLine = (!hasImageSource && selectedStudioProductName)
      ? `${selectedStudioProductName} · ${activeScene.label} · ${activeShot.label}`
      : brain.hasInput
        ? `${brain.categoryLabel} · ${activeScene.label} · ${activeShot.label}`
        : hasImageSource
          ? `${imageIdeaLabel} · ${activeScene.label} · ${activeShot.label}`
          : `${activeScene.label} · ${activeShot.label}`;
    const compactHint = (!hasImageSource && selectedStudioProductName)
      ? 'تم تثبيت المنتج الذي اخترته.'
      : hasImageSource
        ? ''
        : studioProductPickMode === 'smart'
          ? ''
          : 'اختر المنتج عند الحاجة.';
    const primaryBrainLabel = (!hasImageSource && selectedStudioProductName)
      ? selectedStudioProductName
      : hasImageSource
        ? smartSelectionLine
        : studioProductPickMode === 'smart'
          ? 'من كل أصناف مطبخك'
          : smartSelectionLine;
    const matchBadge = calculateStudioMatch(brain, hasImageSource);
    const salesReadiness = matchBadge?.value ? calculateSalesReadiness(brain, matchBadge.value) : null;
    const dishProfile = getAlturathDishProfile(selectedStudioProductName || brain.primaryProductName || customThemeQuery, studioProducts);
    const shouldShowImageProductLink = false;
    const shouldShowProductPicker = studioProductGroups.length > 0 && !hasImageSource;

    if (!brain.hasInput && !hasImageSource && productSuggestions.length === 0) return null;

    return (
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-right shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black text-emerald-600 flex items-center gap-1"><Brain size={14} /> {hasImageSource ? 'تحليل الصورة' : 'اختيار ذكي'}</div>
            <div className="mt-1 text-sm font-black text-slate-950 leading-6 whitespace-normal [word-break:keep-all]">{primaryBrainLabel}</div>
            {compactHint && <div className="mt-1 text-[11px] font-bold text-slate-500 leading-6">{compactHint}</div>}
          </div>
          {(matchBadge || salesReadiness) && (
            <div className="flex flex-col gap-1 shrink-0">
              {matchBadge && <div className="rounded-2xl bg-white border border-emerald-100 px-3 py-2 text-center text-[10px] font-black text-emerald-700">{matchBadge.label}</div>}
              {salesReadiness && <div className="rounded-2xl bg-white/70 border border-slate-100 px-3 py-2 text-center text-[10px] font-black text-slate-600">بيع {salesReadiness}%</div>}
            </div>
          )}
        </div>

        {!brain.canGenerate && (
          <div className="rounded-2xl border p-3 text-[11px] font-black leading-6 bg-red-50 border-red-200 text-red-700">
            {brain.productGuardMessage}
            <div className="mt-1 text-[10px] text-red-500">طبق جديد؟ أضفه للمنيو أولاً.</div>
          </div>
        )}

        {shouldShowImageProductLink && (
          <button
            type="button"
            onClick={() => { setStudioProductPickMode('manual'); setShowStudioProductPicker(true); }}
            className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-right text-xs font-black text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all flex items-center justify-between gap-3"
          >
            <span>ربط بمنتج</span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {shouldShowProductPicker && (
          <div className="rounded-[1.6rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStudioProductPicker(!showStudioProductPicker)}
              className="w-full flex items-center justify-between gap-3 p-3 text-right hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black text-slate-400">اختيار المنتج</div>
                <div className="text-xs font-black text-slate-950 mt-0.5 truncate">
                  {studioProductPickMode === 'smart'
                    ? 'ذكي تلقائي'
                    : selectedStudioProductName
                      ? selectedStudioProductName
                      : 'اختر المنتج'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedStudioProductName && <div className="rounded-2xl bg-slate-950 text-white px-3 py-2 text-[10px] font-black max-w-[150px] truncate">{selectedStudioProductName}</div>}
                <div className="rounded-full bg-slate-100 p-2">
                  <ChevronLeft className={cn("w-4 h-4 text-slate-500 transition-transform", showStudioProductPicker ? "-rotate-90" : "rotate-0")} />
                </div>
              </div>
            </button>

            {showStudioProductPicker && (
              <div className="border-t border-slate-100 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1 border border-slate-100">
                  <button type="button" onClick={() => { setStudioProductPickMode('smart'); setSelectedStudioProductId(''); }} className={cn("rounded-xl px-3 py-2 text-[11px] font-black transition-all", studioProductPickMode === 'smart' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>ذكي تلقائي</button>
                  <button type="button" onClick={() => setStudioProductPickMode('manual')} className={cn("rounded-xl px-3 py-2 text-[11px] font-black transition-all", studioProductPickMode === 'manual' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>أختار بنفسي</button>
                </div>

                {studioProductPickMode === 'smart' ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-[11px] font-black text-emerald-800">
                    سأختار الأنسب تلقائيًا.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {studioProductGroups.map((group) => (
                        <button key={group.id} type="button" onClick={() => { setSelectedStudioCategoryId(group.id); setSelectedStudioProductId(''); }} className={cn("shrink-0 rounded-2xl border px-3 py-2 text-[11px] font-black transition-all", activeStudioCategoryId === group.id ? "bg-slate-950 text-white border-slate-950 shadow-sm" : "bg-white text-slate-600 border-slate-100 hover:border-slate-300")}>{group.label}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {activeStudioCategoryProducts.map((product: any) => {
                        const name = getAlturathProductName(product);
                        const isSelected = String(selectedStudioProductId) === String(product.id);
                        return (
                          <button key={product.id || name} type="button" onClick={() => { setSelectedStudioProductId(String(product.id || '')); setShowStudioProductPicker(false); }} className={cn("rounded-2xl border p-3 text-right transition-all", isSelected ? "bg-emerald-50 border-emerald-400 ring-4 ring-emerald-500/10" : "bg-slate-50 border-slate-100 hover:bg-white hover:border-emerald-200")}>
                            <div className="text-xs font-black text-slate-950 truncate">{name}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1">ضمن {studioProductGroups.find(g => g.id === activeStudioCategoryId)?.label || 'قائمة مطبخك'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(brain.hasInput || selectedStudioProductName) && (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 text-[10px] font-black text-slate-500 leading-5">
            {dishProfile.shortLabel} · {dishProfile.deliverySuitability.label} · {dishProfile.clutterRisk.label}
          </div>
        )}

        {brain.warning && <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 p-3 text-[11px] font-black leading-6">{brain.warning}</div>}

        {context === 'reel' && brain.hasInput && (
          <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
            <div className="text-[10px] font-black text-violet-600 mb-2">وصفة الريل حسب الطبق</div>
            <div className="grid gap-1">
              {brain.reelRecipe.map((item, index) => <div key={item} className="text-[11px] font-bold text-violet-900">{index + 1}. {item}</div>)}
            </div>
          </div>
        )}

      </div>
    );
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
    const sceneLabel = activeStudioScene.label;
    const placeId = item?.place || selectedOrderPlace;
    const modeId = item?.mode || realityMode;
    const moodLabel = item?.mood || selectedMood;
    const ideaText = item?.customIdea || customThemeQuery;
    return [
      `المسار: ${(item?.source || (studioTab === 'product' ? 'image' : 'idea')) === 'image' ? 'من صورة' : 'من فكرة'}`,
      `المقاس: ${formatLabel}`,
      `المشهد: ${sceneLabel} / ${KUWAIT_PLACES[placeId]?.label || KUWAIT_PLACES[selectedOrderPlace]?.label}`,
      `الإضاءة: ${moods.find((m) => m.id === moodLabel)?.label || moodLabel}`,
      `الواقعية: ${cleanRealityLabel(STUDIO_REALITY_MODES[modeId]?.label || '')}`,
      ideaText ? `الفكرة: ${ideaText}` : '',
      `بصمة الطبق: ${getAlturathDishProfile(ideaText || customThemeQuery || activeStudioScene.label, data?.products || []).fingerprintMini}`
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
    { n: 2, t: 'المشهد والفكرة' },
    { n: 5, t: 'أدوات' },
    { n: 6, t: 'توليد' },
  ];
  const visibleStudioSteps = studioTab === 'product' ? fullStudioSteps : ideaFastSteps;

  const startFastIdeaPath = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    setSelectedFormat('9:16');
    setSelectedTheme('نبض الكويت');
    setCustomThemeQuery('');
    setCreateSubTab('custom');
    setMaxCreateStepReached(2);
    setCreateStep(2);
    setStudioTab('create');
  };

  const startFastReelPath = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    setSelectedFormat('9:16');
    setReelSource('idea');
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelSubTab('generate');
    setReelStep(4);
    setStudioTab('reel');
  };

  const openMenuGenerator = (target: 'image' | 'reel') => {
    const currentName = selectedStudioProductName || customThemeQuery.trim();
    if (!currentName) {
      toast.error('اختر وجبة من المنيو أولاً');
      return;
    }
    closeOpenPanels();
    resetGeneratedOutput();
    setCustomThemeQuery(currentName);
    setSelectedTheme('نبض الكويت');
    setSelectedSceneId('food-detail');
    setSelectedOrderPlace('delivery');
    setBackgroundPreset('neutral-menu');
    setRealityMode('finalBoss');
    setSelectedMood('ناعم');
    if (target === 'image') {
      setSelectedFormat('1:1');
      setCreateSubTab('custom');
      setMaxCreateStepReached(6);
      setCreateStep(6);
      setStudioTab('create');
      toast.success('جهزنا الصورة من المنيو — بقي ضغطة التوليد');
      return;
    }
    setSelectedFormat('9:16');
    setReelSource('idea');
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelSubTab('generate');
    setReelStep(4);
    setStudioTab('reel');
    toast.success('جهزنا الريل من المنيو — بقي ضغطة التوليد');
  };

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
              استوديو التراث الذكي
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
        <div className="max-w-5xl mx-auto rounded-[2rem] bg-white border border-slate-100 shadow-sm p-5 text-right">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black text-indigo-500 mb-1">اختَر البداية</p>
              <h2 className="text-2xl font-black text-slate-950">ابدأ بالصيغة المناسبة لمحتواك</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); setCreateStep(1); setMaxCreateStepReached(1); setCreateSubTab('custom'); setStudioTab('create'); }} className="rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white p-5 text-right transition-all">
              <Sparkles className="text-indigo-500 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">من فكرة</div>
              <div className="text-xs font-bold text-slate-400 mt-1">اكتب وصفك، أو اختر بداية جاهزة.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setProductStep(1); setMaxProductStepReached(1); setStudioTab('product'); }} className="rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white p-5 text-right transition-all">
              <Camera className="text-indigo-500 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">من صورة</div>
              <div className="text-xs font-bold text-slate-400 mt-1">ارفع صورة المنتج ونرتّبها بواقعية أعلى.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setSelectedFormat('9:16'); setReelStep(1); setReelSource('idea'); setGeneratedReel(null); setShowReelSettings(false); setReelSubTab('generate'); setStudioTab('reel'); }} className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white hover:bg-white p-5 text-right transition-all relative overflow-hidden">
              <Film className="text-violet-600 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">ريل مباشر</div>
              <div className="text-xs font-bold text-slate-400 mt-1">فيديو واقعي 4–8 ثواني جاهز لريلز.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setMenuOutputType('image'); setStudioTab('storyboard'); }} className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white hover:bg-white p-5 text-right transition-all relative overflow-hidden">
              <Layout className="text-emerald-600 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">من المنيو</div>
              <div className="text-xs font-bold text-slate-400 mt-1">اختر وجبة جاهزة، ثم جهّزها لصورة أو ريل.</div>
            </button>
            <button onClick={() => { closeOpenPanels(); resetGeneratedOutput(); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); setCreateSubTab('campaigner'); setCreateStep(1); setMaxCreateStepReached(1); setStudioTab('create'); }} className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white hover:bg-white p-5 text-right transition-all relative overflow-hidden">
              <Brain className="text-rose-600 mb-3" size={26} />
              <div className="font-black text-slate-900 text-lg">حملة ذكية</div>
              <div className="text-xs font-bold text-slate-400 mt-1">ابدأ مباشرة من رادار المواسم والطقس.</div>
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
                    <div className="p-3 text-[11px] font-bold text-slate-500 line-clamp-2">{archiveTab === 'image' ? 'صورة منتج' : 'صورة من فكرة'}</div>
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

            <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 text-right">
              <div className="text-xs font-black text-violet-700">ريل مباشر</div>
              <div className="text-[11px] font-bold text-violet-900/70 mt-1">اختيار الوجبة من المنيو أصبح في مسار مستقل: من المنيو.</div>
            </div>

            {false ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-500">سيناريوهات ولقطات مخرجة مسبقاً</span>
                  <select
                    id="storyboard-product-select-left"
                    value={selectedStudioProductId}
                    onChange={(e) => {
                      setSelectedStudioProductId(e.target.value);
                      const prod = data?.products?.find((p: any) => String(p.id) === String(e.target.value));
                      if (prod) {
                        setCustomThemeQuery(getAlturathProductName(prod));
                        setSelectedStudioProductId(String(prod.id));
                      }
                    }}
                    className="rounded-xl border border-slate-150 bg-slate-50 p-2 text-[10px] font-black text-slate-700 focus:outline-none focus:border-violet-400 text-right"
                  >
                    <option value="">اختر من المطبخ</option>
                    {data?.products?.map((p: any) => (
                      <option key={p.id} value={p.id}>{getAlturathProductName(p)}</option>
                    ))}
                  </select>
                </div>

                <input
                  id="storyboard-theme-input-left"
                  type="text"
                  placeholder="اكتب اسم طبق كويتي لتفصيل سيناريو..."
                  value={customThemeQuery}
                  onChange={(e) => setCustomThemeQuery(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border bg-white text-xs text-right focus:outline-none focus:border-violet-500 font-sans"
                />

                {(() => {
                  const currentName = selectedStudioProduct ? getAlturathProductName(selectedStudioProduct) : (customThemeQuery || 'طبق التراث المميز');
                  const steps = getStoryboardStepsForProduct(currentName);
                  return (
                    <div className="space-y-4">
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {steps.map((st) => (
                          <div key={st.step} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-3 relative text-right">
                            <span className="absolute left-3 top-3 font-mono text-xl font-black text-violet-200/40 select-none">
                              {st.step}
                            </span>
                            <div>
                              <span className="text-[9px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{st.title}</span>
                              <h4 className="text-xs font-black text-slate-900 mt-2.5 leading-normal">{st.shotName}</h4>
                              
                              <div className="mt-2.5 space-y-2 border-t border-dashed border-slate-200/60 pt-2.5 text-[10px] leading-relaxed">
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 block">حركة الكاميرا</span>
                                  <p className="font-bold text-slate-600 mt-0.5">{st.camera}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 block">الإحساس البصري</span>
                                  <p className="font-bold text-slate-505 mt-0.5">{st.vibe}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 block">الترشيح الصوتي</span>
                                  <p className="font-bold text-slate-505 mt-0.5">{st.audio}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200/40 pt-2 mt-1">
                              <span className="text-[9px] font-black text-slate-400">الزاوية: 4K ستيديكام</span>
                              <span className="text-[10px] font-black text-violet-700">{st.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-2xl border border-violet-100 bg-violet-50/10 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const formattedText = [
                              `🎬 سيناريو مخرج الريلز القصير لصنف: ${currentName}`,
                              `===========================================`,
                              ...steps.flatMap(s => [
                                `[اللقطة ${s.step}]: ${s.title}`,
                                `- اللقطة: ${s.shotName}`,
                                `- الكاميرا: ${s.camera}`,
                                `- الإيقاع والحس: ${s.vibe}`,
                                `- الإيقاع الصوتي والسمعي: ${s.audio}`,
                                `- المدة: ${s.duration}`,
                                `-------------------------------------------`
                              ])
                            ].join('\\n');
                            await writeClipboardText(formattedText);
                            toast.success('تم نسخ سيناريو المخرج');
                          }}
                          className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs transition-all shadow flex items-center justify-center gap-1.5"
                        >
                          <Copy size={12} />
                          نسخ سيناريو المخرج بالكامل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomThemeQuery(`${currentName} في مشهد تصوير سينمائي ناعم وراق`);
                            setSelectedSceneId('food-detail');
                            setSelectedOrderPlace('delivery');
                            setBackgroundPreset('neutral-menu');
                            setRealityMode('finalBoss');
                            setSelectedFormat('9:16');
                            setReelStep(4);
                            setReelSubTab('generate');
                            toast.success('تم نقل معلومات اللقطات لاستوديو الريلز');
                          }}
                          className="w-full p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <Film size={12} />
                          تجهيز المشهد والتوليد فوراً بمقاس ريلز
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
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
                  <input type="text" placeholder="مثال: لقطة مجبوس حار يفتح الشهية لريلز إنستغرام..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-violet-500 transition-all duration-300 animate-in fade-in" />
                )}
                {renderAlturathBrainCard('reel')}
                {reelSource === 'image' && (
                  <div onClick={() => reelImageInputRef.current?.click()} className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 cursor-pointer text-center">
                    <input type="file" ref={reelImageInputRef} className="hidden" accept="image/*" onChange={handleReelImageUpload} />
                    {selectedImage ? <img src={selectedImage} alt="صورة الريل المختارة" className="mx-auto mb-3 h-40 w-full rounded-2xl object-cover border border-violet-100 bg-white" /> : <Camera className="mx-auto mb-2 text-violet-600" size={26} />}
                    <p className="text-sm font-black text-slate-800">{selectedImage ? 'الصورة ظاهرة وجاهزة للريل' : 'ارفع صورة طبق للريل'}</p>{selectedImage && <p className="mt-1 text-[10px] font-bold text-violet-500">اضغط هنا لتغيير الصورة</p>}
                  </div>
                )}
                <button type="button" onClick={() => setReelStep(2)} className="w-full p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
              </div>
            )}

            {reelStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500">اختر نوع اللقطة</p>
                {(() => {
                  const activeShot = reelShots.find((shot) => shot.id === reelShot) || reelShots[0];
                  return (
                    <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50 p-3 space-y-3">
                      <button type="button" onClick={() => setShowReelShotList((v) => !v)} className="w-full rounded-3xl bg-white border border-slate-100 p-4 text-right flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3"><span className="text-2xl">{activeShot.icon}</span><span><span className="block text-xs font-black text-slate-500">اللقطة المختارة</span><span className="block text-sm font-black text-slate-950 mt-1">{activeShot.label}</span></span></span>
                        <ChevronLeft className={cn("transition-transform text-slate-400", showReelShotList ? "-rotate-90" : "")} size={20} />
                      </button>
                      {showReelShotList && (
                        <div className="grid grid-cols-1 gap-2">
                          {reelShots.map((shot) => (
                            <button key={shot.id} type="button" onClick={() => { setReelShot(shot.id); setShowReelShotList(false); }} className={cn("rounded-2xl border p-4 text-right transition-all flex items-center gap-3", reelShot === shot.id ? "bg-violet-50 border-violet-400 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50")}>
                              <span className="text-2xl">{shot.icon}</span><span><span className="block text-sm font-black text-slate-900">{shot.label}</span><span className="block text-[11px] font-bold text-slate-400 mt-1">{shot.desc}</span></span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={() => setReelStep(3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button></div>
              </div>
            )}

            {reelStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500">مدة الريل</p>
                <div className="grid grid-cols-2 gap-2">
                  {[4, 6, 8].map((seconds) => <button key={seconds} type="button" onClick={() => setReelDuration(seconds)} className={cn("rounded-2xl border p-5 text-center transition-all", reelDuration === seconds ? "bg-violet-50 border-violet-500 text-violet-700 shadow-sm" : "bg-white border-slate-100 text-slate-500")}><span className="text-2xl font-black">{seconds}</span><span className="block text-[10px] font-bold mt-1">ثواني</span></button>)}
                </div>
                {renderPlaceLibrary()}
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(2)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={() => setReelStep(4)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button></div>
              </div>
            )}

            {reelStep === 4 && (
              <div className="space-y-4">
                {renderFineTools()}
                <div className="rounded-3xl bg-slate-950 text-white p-5"><div className="text-[11px] font-black text-white/45 mb-2">جاهز للتوليد</div><div className="text-lg font-black">{customThemeQuery.trim() || `${reelShots.find(s => s.id === reelShot)?.icon} ${reelShots.find(s => s.id === reelShot)?.label}`}</div><div className="mt-2 text-sm font-bold text-white/60">{reelShots.find(s => s.id === reelShot)?.label} · 9:16 · {reelDuration} ثواني · {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>{reelSource === 'image' && selectedImage && <img src={selectedImage} alt="مصدر الريل" className="mt-4 h-28 w-full rounded-2xl object-cover border border-white/10" />}</div>
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReelStep(3)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={generateReel} disabled={isGeneratingReel} className="p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isGeneratingReel ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />} ولّد الريل</button></div>
              </div>
            )}
            </>)}
          </div>

          <div className="rounded-[2.2rem] bg-slate-950 p-3 shadow-2xl border border-slate-900 min-h-[620px] flex items-center justify-center relative overflow-hidden studio-preview-stage">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            {renderProductionDesk('reel')}
            {!generatedReel && !isGeneratingReel && <div className="relative z-10 text-center text-white p-8"><div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-5xl shadow-2xl"><Film size={46} /></div><h3 className="text-3xl font-black mb-3">معاينة الريل تظهر هنا</h3><p className="text-sm font-bold text-white/55 leading-7">ريل عمودي واقعي · {reelDuration} ثواني</p></div>}
            {isGeneratingReel && <div className="relative z-10 text-center text-white p-8"><Loader2 className="mx-auto mb-5 animate-spin" size={46} /><p className="font-black">نولّد ريل واقعي...</p><p className="mt-3 text-xs font-bold text-white/45">نثبت الطعام ونحرك الكاميرا فقط</p></div>}
            {generatedReel && !isGeneratingReel && <div className="relative z-10 w-full max-w-[380px] space-y-4"><button type="button" onClick={() => setShowReelSettings((v) => !v)} className="w-full aspect-[9/16] rounded-[1.8rem] overflow-hidden bg-black border border-white/10 shadow-2xl relative group">{generatedReel.startsWith('data:image') ? <img src={generatedReel} className="w-full h-full object-contain bg-black" alt="ريل موشن" /> : <video src={generatedReel} className="w-full h-full object-contain bg-black" controls playsInline />}</button>{showReelSettings && <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-right text-white"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3"><div><p className="text-xs font-black text-white/75">إعدادات هذا الريل</p><p className="text-[11px] font-bold text-white/45 mt-1">انسخها وكرر نفس الحركة لاحقاً.</p></div><button type="button" onClick={() => copyReelSettings()} className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-xs font-black flex items-center gap-1"><Copy size={14} /> نسخ</button></div><pre className="whitespace-pre-wrap rounded-2xl bg-black/20 border border-white/10 p-3 text-[11px] leading-6 font-bold text-white/80 text-right font-sans max-h-48 overflow-y-auto break-words">{buildReelSettingsText()}</pre></div>}<div className="flex items-center justify-center gap-2"><button onClick={downloadReel} title="تحميل" aria-label="تحميل" className="h-12 w-12 rounded-2xl bg-violet-500 text-white flex items-center justify-center"><Download size={18} /></button><button type="button" onClick={() => copyReelSettings()} title="نسخ الإعدادات" aria-label="نسخ الإعدادات" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"><Copy size={18} /></button><button type="button" onClick={() => { setGeneratedReel(null); setReelStep(4); }} title="إعادة بنفس الأسلوب" aria-label="إعادة بنفس الأسلوب" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"><RotateCcw size={18} /></button></div></div>}
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
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">اختر المقاس المناسب، ثم اكتب فكرتك أو خلّ استوديو التراث الذكي يقترح لك المسار.</p>
              </div>
            </div>

            {/* Sub Tab Switching Inside the Left Configuration Column */}
            <div className="flex gap-1 bg-slate-50 border border-slate-100 p-1 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setCreateSubTab('custom')}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-xl transition-all",
                  createSubTab === 'custom'
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850"
                )}
              >
                💡 فكرة حرة
              </button>
              <button
                type="button"
                onClick={() => setCreateSubTab('campaigner')}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-xl transition-all",
                  createSubTab === 'campaigner'
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850"
                )}
              >
                📅 رادار المواسم والطقس
              </button>
            </div>

            {createSubTab === 'campaigner' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="text-xs font-black text-slate-500">حملات فورية تلقائية متزامنة مع الطقس الكويتي</p>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {KUWAIT_SEASON_CAMPAIGNS.map((campaign) => {
                    const isSelected = selectedSceneId === campaign.id;
                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => {
                          setSelectedSceneId(campaign.id);
                          setSelectedPulseId(campaign.pulseId);
                          setSelectedOrderPlace(campaign.place);
                          setBackgroundPreset(campaign.background);
                          setRealityMode(campaign.realityMode);
                          setSelectedMood(campaign.mood);
                        }}
                        className={cn(
                          "w-full p-4 rounded-2xl border text-right transition-all flex flex-col justify-between hover:bg-slate-50 relative overflow-hidden text-slate-700 select-none outline-none",
                          isSelected
                            ? "bg-rose-50/50 border-rose-300 ring-4 ring-rose-500/5 shadow-sm"
                            : "bg-white border-slate-100/80"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-2xl">{campaign.icon}</span>
                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 border px-2 py-0.5 rounded-full">{campaign.seasonLabel}</span>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 mt-2.5">{campaign.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2 leading-relaxed">{campaign.desc}</p>
                        
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/55 w-full">
                          <span className="text-[9px] font-black text-slate-400">{KUWAIT_PLACES[campaign.place]?.label || campaign.place} · {campaign.mood}</span>
                          <span className={cn("text-[10px] font-black", isSelected ? "text-rose-600" : "text-slate-400")}>
                            {isSelected ? 'تفعيل تلقائي ✓' : 'تفعيل'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeCampaign = KUWAIT_SEASON_CAMPAIGNS.find(c => c.id === selectedSceneId) || KUWAIT_SEASON_CAMPAIGNS[0];
                  return (
                    <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/20 text-right space-y-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <Sparkles size={14} className="text-rose-500 animate-pulse shrink-0" />
                          حملة: {activeCampaign.title}
                        </h4>
                        <div className="text-[10px] font-bold text-slate-500 mt-1.5 leading-relaxed bg-white border border-rose-100/50 rounded-xl p-2.5">
                          <span className="text-rose-600 font-black block text-[9px] mb-1">الخلفية والجو الذكي</span>
                          {activeCampaign.desc}
                        </div>
                      </div>

                      <div className="bg-white border border-rose-100/50 rounded-xl p-2.5">
                        <span className="text-rose-600 font-black block text-[9px] mb-1">الإيقاع الصوتي والسمعي</span>
                        <div className="text-[10px] font-bold text-slate-700 leading-relaxed">{activeCampaign.soundscapeSuggestion}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomThemeQuery(activeCampaign.visualPromptAddition);
                            setSelectedSceneId(activeCampaign.id);
                            setSelectedPulseId(activeCampaign.pulseId);
                            setSelectedOrderPlace(activeCampaign.place);
                            setBackgroundPreset(activeCampaign.background);
                            setRealityMode(activeCampaign.realityMode);
                            setSelectedMood(activeCampaign.mood);
                            setCreateSubTab('custom');
                            setCreateStep(6);
                            setMaxCreateStepReached(6);
                            toast.success('تمت تهيئة محددات رادار المواسم');
                          }}
                          className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] shadow transition-all flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={12} />
                          تطبيق وتعديل
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const settingsText = [
                              `الحملة: ${activeCampaign.title}`,
                              `الوصف البصري: ${activeCampaign.visualPromptAddition}`,
                              `المكان الافتراضي: ${KUWAIT_PLACES[activeCampaign.place]?.label || activeCampaign.place}`,
                              `الإضاءة: ${activeCampaign.mood}`,
                              `الترشيح الصوتي: ${activeCampaign.soundscapeSuggestion}`
                            ].join('\\n');
                            await writeClipboardText(settingsText);
                            toast.success('تم نسخ محددات الحملة');
                          }}
                          className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold text-[10px] transition-all flex items-center justify-center gap-1.5"
                        >
                          <Copy size={12} />
                          نسخ الإعدادات
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
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
                  <input type="text" placeholder="اكتب وصف الصورة المطلوبة..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-indigo-500" />
                  <p className="text-[11px] font-bold text-slate-400">اكتب وصفك ونختصر لك الطريق، أو اتركها فارغة للاقتراحات الجاهزة.</p>
                </div>
                {customThemeQuery.trim() ? <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs font-black text-indigo-700">اعتمدنا الفكرة. التالي يفتح لك المشهد والبيئة.</div> : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs font-black text-slate-500">تبي اختيارات جاهزة؟ التالي يفتح لك المشهد والبيئة.</div>}
                {renderAlturathBrainCard('image')}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => goCreateStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                  <button type="button" onClick={() => advanceCreateStep(3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">المشهد</button>
                </div>
              </div>
            )}

            {createStep === 3 && (() => {
              const activeScene = mergedScenes.find(s => s.id === selectedSceneId) || mergedScenes[0];

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
                            const isSelected = selectedSceneId === scene.id;
                            return (
                              <button
                                key={scene.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSceneId(scene.id);
                                  if (scene.id === 'national-day') setSelectedPulseId('national-day');
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
                  <button type="button" onClick={() => goCreateStep(2)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                  <button type="button" onClick={() => advanceCreateStep(6)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                </div>
              </div>
            )}

            {createStep === 6 && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-950 text-white p-5">
                  <div className="text-[11px] font-black text-white/45 mb-2">آخر مرحلة</div>
                  <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">{customThemeQuery.trim() || activeStudioScene.label}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-black text-white/85">
                    {(() => { const badge = calculateStudioMatch(currentStudioBrain, false); const sale = calculateSalesReadiness(currentStudioBrain, badge?.value); const profile = getAlturathDishProfile(selectedStudioProductName || currentStudioBrain.primaryProductName || customThemeQuery, studioProducts); return <div className="rounded-2xl bg-emerald-400/15 border border-emerald-300/20 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">جاهزية: {sale}% · {profile.deliverySuitability.label}</div>; })()}
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المشهد: {(mergedScenes.find(s => s.id === selectedSceneId) || mergedScenes[0]).label}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">اللقطة: {(reelShots.find(s => s.id === reelShot) || reelShots[0]).label}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المكان: {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المنتج: {selectedStudioProductName || 'تلقائي'}</div>
                  </div>
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
            </>)}
          </div>

          <div className="rounded-[2.2rem] bg-slate-950 p-3 sm:p-4 shadow-2xl border border-slate-900 min-h-[420px] sm:min-h-[560px] flex items-center justify-center relative overflow-hidden studio-preview-stage">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            {renderProductionDesk('image')}
            {!generatedImage && !isGenerating && (
              <div className="relative z-10 text-center text-white p-8">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 text-6xl shadow-2xl">{activeStudioScene.icon}</div>
                <h3 className="text-3xl font-black mb-3">المعاينة تظهر هنا</h3>
                <p className="text-sm font-bold text-white/55 leading-7">{activeStudioScene.label} · {KUWAIT_PLACES[selectedOrderPlace]?.label}</p>
              </div>
            )}
            {isGenerating && <div className="relative z-10 text-center text-white p-8"><Loader2 className="mx-auto mb-5 animate-spin" size={46} /><p className="font-black">نجهز صورة واقعية...</p></div>}
            {generatedImage && !isGenerating && (
              <div className="relative z-10 w-full max-w-full space-y-4">
                <button type="button" onClick={() => setShowImageSettings((v) => !v)} className={cn("w-full rounded-[1.6rem] overflow-hidden bg-white/5 border border-white/10 relative group", previewAspectClass)}>
                  {generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  ) : null}
                  <span className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                </button>
                {showImageSettings && (
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-right text-white shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-black text-white/75">إعدادات هذه الصورة</p>
                        <p className="text-[11px] font-bold text-white/45 mt-1">انسخها لتكرار نفس النتيجة لاحقاً.</p>
                      </div>
                      <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2"><button type="button" onClick={startFreshImageUpload} className="w-full sm:w-auto rounded-2xl bg-white/10 border border-white/15 text-white px-4 py-2 text-xs font-black">رفع صورة جديدة</button><button type="button" onClick={copyCurrentSettings} className="w-full sm:w-auto rounded-2xl bg-white text-slate-950 px-4 py-2 text-xs font-black">نسخ الإعدادات</button></div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-2xl bg-black/20 border border-white/10 p-3 text-[11px] leading-6 font-bold text-white/80 text-right font-sans max-h-48 overflow-y-auto break-words">{buildSettingsText()}</pre>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <button onClick={handleDownload} title="تحميل" aria-label="تحميل" className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center"><Download size={18} /></button>
                  <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !generatedImage} title="اجعلها أصدق" aria-label="اجعلها أصدق" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40"><Sparkles size={18} /></button>
                  <button type="button" onClick={markCurrentStyleAsAvoided} title="لا تكرر الأسلوب" aria-label="لا تكرر الأسلوب" className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"><X size={18} /></button>
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
                      <input type="text" placeholder="اكتب الجو أو المطلوب للصورة..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 text-sm text-right focus:outline-none border-slate-200 bg-white focus:border-indigo-500" />
                      <p className="text-[11px] font-bold text-slate-400">اكتب فكرتك وننتقل مباشرة للمسات النهائية، أو اتركها فارغة للاختيارات الجاهزة.</p>
                    </div>
                    {customThemeQuery.trim() ? <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs font-black text-indigo-700">اعتمدنا الفكرة. بعدها لمسات نهائية ثم التوليد.</div> : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs font-black text-slate-500">تبي اختيارات جاهزة؟ التالي يفتح لك المشهد والبيئة.</div>}
                    {renderAlturathBrainCard('image')}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => goProductStep(1)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button type="button" onClick={() => advanceProductStep(3)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">المشهد</button>
                    </div>
                  </div>
                )}

                {productStep === 3 && (() => {
                  const activeScene = mergedScenes.find(s => s.id === selectedSceneId) || mergedScenes[0];

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
                                const isSelected = selectedSceneId === scene.id;
                                return (
                                  <button
                                    key={scene.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSceneId(scene.id);
                                      if (scene.id === 'national-day') setSelectedPulseId('national-day');
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
                      <button type="button" onClick={() => goProductStep(3)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button type="button" onClick={() => advanceProductStep(6)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                    </div>
                  </div>
                )}

                {productStep === 6 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-slate-950 text-white p-5">
                      <div className="text-[11px] font-black text-white/45 mb-2">آخر مرحلة</div>
                      <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">{customThemeQuery.trim() || activeStudioScene.label}</div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-black text-white/85">
                        {(() => { const imageBrain = analyzeAlturathStudioIdea(customThemeQuery, studioProducts); const badge = calculateStudioMatch(imageBrain, true); const sale = calculateSalesReadiness(imageBrain, badge?.value); const profile = getAlturathDishProfile(customThemeQuery || sceneSuggestion?.productType || activeStudioScene.label, studioProducts); return <div className="rounded-2xl bg-emerald-400/15 border border-emerald-300/20 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">جاهزية: {sale}% · {profile.clutterRisk.label}</div>; })()}
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المشهد: {(mergedScenes.find(s => s.id === selectedSceneId) || mergedScenes[0]).label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">اللقطة: {(reelShots.find(s => s.id === reelShot) || reelShots[0]).label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المكان: {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المنتج: {selectedStudioProductName || 'تلقائي'}</div>
                      </div>
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
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[250px] md:min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden studio-preview-stage studio-preview-stage-light">
              {renderProductionDesk('image')}
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
                </div>
              )}

              {isGenerating && (
                <div className="relative z-10 w-full max-w-lg mx-auto p-8 text-center text-slate-950">
                  <div className="relative mx-auto mb-6 h-28 w-28">
                    <div className="absolute inset-0 rounded-[2rem] bg-indigo-500/20 blur-2xl animate-pulse" />
                    <div className="relative h-full w-full rounded-[2rem] bg-white border border-indigo-100 shadow-2xl flex items-center justify-center">
                      <Sparkles className="text-indigo-600 animate-pulse" size={42} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black mb-2">نجهز الصورة الواقعية...</h3>
                  <p className="text-xs font-black text-slate-500 leading-6">نثبت الطبق · نضبط الإضاءة · نركب المشهد الكويتي بدون تشويه المنتج</p>
                  <div className="mt-6 mx-auto max-w-xs h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-slate-950 animate-pulse" />
                  </div>
                </div>
              )}

              {generatedImage && !isGenerating && (
                <div className="relative z-10 w-full max-w-full space-y-4 p-2 text-center">
                  <button type="button" onClick={() => setShowImageSettings((v) => !v)} className={cn("w-full max-w-3xl mx-auto rounded-[1.6rem] overflow-hidden bg-white border border-slate-100 shadow-sm relative group block", previewAspectClass)}>
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain bg-white" />
                    <span className="absolute bottom-4 right-4 rounded-2xl bg-slate-950/85 px-3 py-2 text-[10px] font-black text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                  </button>
                  {showImageSettings && (
                    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-4 text-right text-slate-800 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs font-black text-slate-700">إعدادات هذه الصورة</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">انسخها لتكرار نفس النتيجة لاحقاً.</p>
                        </div>
                        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2"><button type="button" onClick={startFreshImageUpload} className="w-full sm:w-auto rounded-2xl bg-slate-100 text-slate-700 px-4 py-2 text-xs font-black">رفع صورة جديدة</button><button type="button" onClick={copyCurrentSettings} className="w-full sm:w-auto rounded-2xl bg-slate-950 text-white px-4 py-2 text-xs font-black">نسخ الإعدادات</button></div>
                      </div>
                      <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 border border-slate-100 p-3 text-[11px] leading-6 font-bold text-slate-600 text-right font-sans max-h-48 overflow-y-auto break-words">{buildSettingsText()}</pre>
                    </div>
                  )}
                  {realityVariants.length > 0 && (
                    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4">
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

                  <div className="flex flex-wrap gap-2 justify-center px-1">
                    <button onClick={handleDownload} title="تحميل" aria-label="تحميل" className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center"><Download size={18} /></button>
                    <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !generatedImage} title="اجعلها أصدق" aria-label="اجعلها أصدق" className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center disabled:opacity-50"><Sparkles size={18} /></button>
                    <button type="button" onClick={markCurrentStyleAsAvoided} title="لا تكرر الأسلوب" aria-label="لا تكرر الأسلوب" className="h-12 w-12 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center"><X size={18} /></button>
                    <button type="button" onClick={() => { setReelSource('image'); setSelectedImage(generatedImage); setGeneratedReel(null); setShowReelSettings(false); setStudioTab('reel'); setReelStep(1); }} className="h-12 px-5 min-w-[150px] bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs shadow-md transition-all animate-in fade-in"><Film size={16} /> حولها لريل</button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 w-full max-w-3xl mx-auto flex flex-col items-center gap-3">
                    <p className="text-xs font-bold text-slate-500">حفظها داخل المنتج</p>
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                      <select className="flex-1 p-3 border rounded-xl bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 outline-none text-right" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                        <option value="">اختر المنتج</option>
                        {data?.products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={handleSaveToProduct} disabled={!selectedProductId || isSaving} className="px-4 py-3 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
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

      {studioTab === 'storyboard' && (
        <div className="max-w-5xl mx-auto space-y-6 text-right animate-in fade-in duration-300">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-black text-emerald-500 block mb-1">من المنيو</span>
                <h2 className="text-2xl font-black text-slate-955">اختر وجبة، ثم افتح الصورة أو الريل</h2>
                <p className="text-sm font-bold text-slate-500 mt-2 leading-7">نفس منطق الاستوديو بالكامل، لكن البداية هنا من منتجاتك الجاهزة داخل المنيو.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="storyboard-product-select"
                  value={selectedStudioProductId}
                  onChange={(e) => {
                    setSelectedStudioProductId(e.target.value);
                    const prod = data?.products?.find((p: any) => String(p.id) === String(e.target.value));
                    if (prod) {
                      setCustomThemeQuery(getAlturathProductName(prod));
                      setSelectedStudioProductId(String(prod.id));
                    }
                  }}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5 text-xs font-black text-slate-700 focus:outline-none focus:border-emerald-400 text-right"
                >
                  <option value="">اختر وجبة من المنيو</option>
                  {data?.products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{getAlturathProductName(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <input
                id="storyboard-theme-input"
                type="text"
                placeholder="اكتب اسم الطبق إذا حبيت، أو اختره من المنيو..."
                value={customThemeQuery}
                onChange={(e) => setCustomThemeQuery(e.target.value)}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              <div className="space-y-4">
                {renderAlturathBrainCard(menuOutputType === 'reel' ? 'reel' : 'image')}

                {(() => {
                  const currentName = selectedStudioProduct ? getAlturathProductName(selectedStudioProduct) : (customThemeQuery || 'طبق التراث المميز');
                  const steps = getStoryboardStepsForProduct(currentName);
                  return (
                    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowMenuRecipe((v) => !v)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <h3 className="text-sm font-black text-slate-900">وصفة التنفيذ السريع</h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">مستخرجة تلقائياً من اختيارك في المنيو.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {menuOutputType === 'reel' && (
                            <span className="hidden sm:inline rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">
                              سيناريو ريل
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 p-2">
                            <ChevronLeft className={cn("w-4 h-4 text-slate-500 transition-transform", showMenuRecipe ? "-rotate-90" : "rotate-0")} />
                          </span>
                        </div>
                      </button>

                      {showMenuRecipe && (
                        <div className="border-t border-slate-100 p-4 space-y-4 animate-in fade-in duration-200">
                          {menuOutputType === 'reel' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const formattedText = [
                                  `🎬 سيناريو مخرج الريلز القصير لصنف: ${currentName}`,
                                  `===========================================`,
                                  ...steps.flatMap(s => [
                                    `[اللقطة ${s.step}]: ${s.title}`,
                                    `- اللقطة: ${s.shotName}`,
                                    `- الكاميرا: ${s.camera}`,
                                    `- الإيقاع والحس: ${s.vibe}`,
                                    `- الإيقاع الصوتي والسمعي: ${s.audio}`,
                                    `- المدة: ${s.duration}`,
                                    `-------------------------------------------`
                                  ])
                                ].join('\n');
                                await writeClipboardText(formattedText);
                                toast.success('تم نسخ سيناريو المنيو');
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                            >
                              <Copy size={14} /> نسخ السيناريو
                            </button>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {steps.map((st) => (
                              <div key={st.step} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-4 relative">
                                <span className="absolute left-4 top-4 font-mono text-3xl font-black text-emerald-200/50 select-none">
                                  {st.step}
                                </span>
                                <div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{st.title}</span>
                                  <h4 className="text-xs font-black text-slate-900 mt-4 leading-normal">{st.shotName}</h4>
                                  <div className="mt-3 space-y-2 border-t border-dashed border-slate-200/60 pt-3">
                                    <div>
                                      <span className="text-[9px] font-black text-slate-400 block">حركة الكاميرا</span>
                                      <p className="text-[10px] font-bold text-slate-600 mt-0.5 leading-relaxed">{st.camera}</p>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-slate-400 block">العنصر البصري والمشاعر</span>
                                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-relaxed">{st.vibe}</p>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-slate-400 block">الترشيح الصوتي</span>
                                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-relaxed">{st.audio}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-200/40 pt-2.5 mt-2">
                                  <span className="text-[9px] font-black text-slate-400">الزاوية: 4K ستيديكام</span>
                                  <span className="text-[10px] font-black text-emerald-700">{st.duration}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[11px] font-black text-slate-500 mb-3">نوع التوليد</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMenuOutputType('image')} className={cn("rounded-2xl border p-4 text-right transition-all", menuOutputType === 'image' ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-white text-slate-600 border-slate-100")}>
                      <ImageIcon size={18} className="mb-2" />
                      <span className="block text-sm font-black">صورة</span>
                      <span className="block text-[10px] font-bold mt-1 opacity-80">يفتح استوديو الصورة بمنتجك المختار</span>
                    </button>
                    <button type="button" onClick={() => setMenuOutputType('reel')} className={cn("rounded-2xl border p-4 text-right transition-all", menuOutputType === 'reel' ? "bg-violet-600 text-white border-violet-600 shadow-md" : "bg-white text-slate-600 border-slate-100")}>
                      <Film size={18} className="mb-2" />
                      <span className="block text-sm font-black">ريل</span>
                      <span className="block text-[10px] font-bold mt-1 opacity-80">يفتح ريل مباشر على الوجبة المختارة</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 text-white p-5">
                  <div className="text-[11px] font-black text-white/45 mb-2">ملخص الاختيار</div>
                  <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">{selectedStudioProductName || customThemeQuery || 'اختر وجبة من المنيو'}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-black text-white/85">
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المسار: {menuOutputType === 'image' ? 'صورة من المنيو' : 'ريل من المنيو'}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المكان الافتراضي: {KUWAIT_PLACES.delivery.label}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">الواقعية: {STUDIO_REALITY_MODES.finalBoss?.label || 'واقعية قصوى'}</div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">الأرشيف: {menuOutputType === 'image' ? 'سيحفظ ضمن أرشيف الصور' : 'سيحفظ ضمن أرشيف الريلز'}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">جاهز بنفس منطق الاستوديو</div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1">نجهز لك كل الاختيارات، ثم ننقلك مباشرة لخطوة التوليد النهائية.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openMenuGenerator(menuOutputType)}
                    className={cn("w-full p-4 rounded-2xl text-white font-black shadow-lg flex items-center justify-center gap-2 transition-all", menuOutputType === 'image' ? 'bg-slate-950 hover:bg-slate-800' : 'bg-violet-600 hover:bg-violet-700')}
                  >
                    {menuOutputType === 'image' ? <Sparkles size={18} /> : <PlayCircle size={18} />}
                    {menuOutputType === 'image' ? 'فتح توليد الصورة' : 'فتح توليد الريل'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
