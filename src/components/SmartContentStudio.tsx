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
  publishReady?: boolean;
  dishLocked?: boolean;
  hasTextOrLogo?: boolean;
  instagramReady?: boolean;
  subscores?: {
    dishLock?: number;
    realism?: number;
    textSafety?: number;
    instagramFit?: number;
    appetite?: number;
  };
};

type StudioDirectorResult = {
  productType?: string;
  reason?: string;
  place: KuwaitOrderPlace;
  pulseId: string;
  mode: StudioRealityMode;
  background: StudioBackgroundPresetId;
  mood: string;
  shot: string;
  format?: string;
  confidence?: number;
  directorNote?: string;
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
        <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-8 text-right shadow-sm">
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
  const [reelDirectSource, setReelDirectSource] = useState<'idea' | 'image' | 'menu'>('idea');
  const [imageDirectSource, setImageDirectSource] = useState<'image' | 'idea' | 'menu'>('image');
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
    { id: '1:1', label: 'منشور إنستغرام', sub: '1:1', icon: <ImageIcon size={16} /> },
    { id: '9:16', label: 'ستوري / تيك توك', sub: '9:16', icon: <ImageIcon size={16} className="h-5" /> },
    { id: '4:3', label: 'إعلان أفقي هادئ', sub: '4:3', icon: <ImageIcon size={16} className="w-5" /> }
  ];

  const reelShots = [
    { id: 'hero-push', label: 'اقتراب على الطلب', desc: 'الكاميرا تدخل بهدوء على الطبق مع ثبات كامل للأكل', icon: '🎥' },
    { id: 'box-open', label: 'فتح علبة التوصيل', desc: 'كشف واقعي لعلبة طلب نظيفة بدون يد معقدة', icon: '📦' },
    { id: 'table-pass', label: 'مرور على السفرة', desc: 'حركة جانبية هادئة على صينية أو عدة أطباق', icon: '🍽️' },
    { id: 'floor-spread-overhead', label: 'سفرة أرضية من فوق', desc: 'لقطة علوية مستوحاة من اليمعة: المنتج بالوسط وأطراف الجالسين فقط بدون وجوه', icon: '▦' },
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

  const KUWAIT_TOWERS_STRICT_REFERENCE_LOCK = `Use the uploaded/reference Kuwait Towers photo as a strict architectural reference for Kuwait Towers only. The Kuwait Towers must be accurate and recognizable: exactly 3 towers total; main tallest tower has 2 blue-green/turquoise mosaic spheres (one large lower sphere with a circular ring/observation deck and one smaller upper sphere near the top); second tower has 1 large blue-green mosaic sphere; third tower is a thin white needle tower with 0 spheres; white slender concrete shafts; sharp pointed spires; blue, green, turquoise mosaic sphere pattern. Only the food, table, restaurant/order lighting, and camera angle may change. Do not redesign, simplify, replace, blur beyond recognition, or invent Kuwait Towers. Never make three identical ball towers, never put one sphere on each tower, never add extra towers, never use Burj Khalifa, Dubai skyline, mosque domes, Saudi landmarks, fantasy towers, generic water towers, cartoon landmark, distorted towers, or blurry unrecognizable landmark. Real Kuwait Towers must match the reference landmark: 3 towers only — main tower has 2 spheres, second tower has 1 sphere, third needle tower has 0 spheres.`;

  const mergedScenes = [
    { id: 'delivery-ready', label: 'طلب توصيل جاهز', desc: 'علب مرتبة وكيس plain على كاونتر نظيف؛ أقوى خيار افتراضي', icon: '📦', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'box-reveal', label: 'فتح علبة الطلب', desc: 'كشف بسيط للطبق داخل التغليف بدون يد معقدة أو فوضى', icon: '📦', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'home-rice-tray', label: 'صينية عيوش للبيت', desc: 'مجبوس/مربين/عيش وسمك على سفرة بيتية مرتبة', icon: '🏠', place: 'home', mode: 'finalBoss', background: 'home-table' },
    { id: 'diwaniya-order', label: 'طلب ديوانية للربع', desc: 'طلب جماعي مرتب بخلفية ديوانية blur بدون وجوه أو ديكور مصطنع', icon: '🛋️', place: 'diwaniya', mode: 'human', background: 'diwaniya-table' },
    { id: 'zowara-spread', label: 'سفرة زوارة', desc: 'محاشي/ورق عنب/أطباق عائلية جاهزة للتقديم داخل بيت', icon: '👨‍👩‍👧‍👦', place: 'zowara', mode: 'menu', background: 'zowara-spread' },
    { id: 'floor-spread-overhead', label: 'سفرة أرضية من فوق', desc: 'عرض علوي مثل الصورة: بساط نظيف، المنتج بالوسط، أطراف الجالسين بدون وجوه', icon: '▦', place: 'zowara', mode: 'finalBoss', background: 'floor-spread' },
    { id: 'chalet-weekend-order', label: 'طلب الشاليه', desc: 'طلبات ويكند مرتبة على طاولة بسيطة بإضاءة نهارية أو غروب ناعم', icon: '🌊', place: 'chalet', mode: 'human', background: 'chalet-spread' },
    { id: 'farm-clean-table', label: 'طلب المزرعة', desc: 'طاولة خارجية نظيفة تحت ظل طبيعي؛ بدون خيم وزخارف مبالغ فيها', icon: '🌴', place: 'farm', mode: 'human', background: 'farm-gathering' },
    { id: 'jakhour-clean-order', label: 'طلب الجاخور', desc: 'قعدة عملية نظيفة للربع بخلفية هادئة؛ بدون حيوانات أو تراب أو فوضى', icon: '🐪', place: 'jakhour', mode: 'human', background: 'jakhour-setup' },
    { id: 'late-night-craving', label: 'جوع آخر الليل', desc: 'لقطة قريبة وسريعة لطلب يفتح النفس قبل نهاية اليوم، بدون مبالغة أو فوضى', icon: '🌙', place: 'delivery', mode: 'finalBoss', background: 'delivery-packaging' },
    { id: 'family-lunch', label: 'غداء البيت', desc: 'سفرة بيتية نظيفة تصلح لطلب العائلة وقت الظهر وتبرز الكمية بصدق', icon: '🍚', place: 'home', mode: 'finalBoss', background: 'home-table' },
    { id: 'diwaniya-share', label: 'لقطة المشاركة', desc: 'طلب جماعي واضح للربع، المنتج بالوسط والخلفية حية بدون وجوه أو عناصر مشتتة', icon: '🤝', place: 'diwaniya', mode: 'human', background: 'diwaniya-table' },
    { id: 'gift-ready-order', label: 'طلب يبيض الوجه', desc: 'تغليف مرتب ولقطة فاخرة مقيدة مناسبة للهدايا والزوارات دون ديكور زائد', icon: '🎁', place: 'zowara', mode: 'finalBoss', background: 'zowara-spread' },
    { id: 'food-detail', label: 'تفاصيل الطبق', desc: 'لقطة قريبة للرز أو السمك أو اللحم أو ورق العنب مع ثبات كامل', icon: '🔎', place: 'delivery', mode: 'finalBoss', background: 'neutral-menu' },
    { id: 'kuwait-towers-evening', label: 'أبراج الكويت', desc: 'صورة حقيقية للأبراج كمرجع بصري؛ خلفية بعيدة فقط والطلب يبقى البطل', icon: '🌆', place: 'towers', mode: 'luxury', background: 'kuwait-towers' },
    { id: 'mubarakiya-souk', label: 'سوق المباركية', desc: 'أجواء سوق كويتي شعبي blur بإضاءة دافئة؛ بدون زحمة وجوه أو لافتات مقروءة', icon: '🛍️', place: 'mubarakiya', mode: 'human', background: 'mubarakiya' },
    { id: 'bidaa-coast', label: 'شاطئ البدع', desc: 'طاولة طلب هادئة على ساحل البدع وقت الغروب؛ البحر خلفية ناعمة لا يسرق التركيز', icon: '🏖️', place: 'bidaa', mode: 'human', background: 'bidaa' },
  ];

  const SCENE_TO_REEL_SHOT: Record<string, string> = {
    'box-reveal': 'box-open',
    'delivery-ready': 'hero-push',
    'late-night-craving': 'hero-push',
    'food-detail': 'texture-close',
    'floor-spread-overhead': 'floor-spread-overhead',
    'home-rice-tray': 'top-spread',
    'family-lunch': 'top-spread',
    'zowara-spread': 'top-spread',
    'diwaniya-order': 'table-pass',
    'diwaniya-share': 'table-pass',
    'chalet-weekend-order': 'table-pass',
    'farm-clean-table': 'table-pass',
    'jakhour-clean-order': 'table-pass',
    'gift-ready-order': 'hero-push',
    'kuwait-towers-evening': 'hero-push',
    'mubarakiya-souk': 'table-pass',
    'bidaa-coast': 'table-pass',
    'winter-camp': 'steam-close',
    'rainy-chill': 'steam-close',
    'ramadan-nights': 'top-spread',
    'national-spirit': 'hero-push',
    'summer-chalet': 'table-pass'
  };

  type StudioSceneProductionGuide = {
    visual: string;
    composition: string;
    mustShow: string;
    avoid: string;
    reel: string;
  };

  const SCENE_PRODUCTION_GUIDES: Record<string, StudioSceneProductionGuide> = {
    'delivery-ready': {
      visual: 'مشهد طلب توصيل جاهز: علب مرتبة وكيس plain أو تغليف نظيف على كاونتر/طاولة بسيطة، المنتج واضح كطلب جاهز للاستلام.',
      composition: 'التكوين منظم: العلبة أو الكيس في الخلف أو الجانب، الطعام/الطلب في المركز، مساحة نظيفة حول المنتج بدون ازدحام.',
      mustShow: 'يجب أن تظهر هوية التوصيل: علبة أو كيس أو تغليف واضح، مع إحساس جاهزية الطلب.',
      avoid: 'ممنوع تحويل المشهد إلى مطعم جلوس، سيارة توصيل، سائق، شعارات، فوضى تغليف، أو ديكور تراثي مصطنع.',
      reel: 'للريل: push-in أو حركة قصيرة على الطلب الجاهز؛ حافظ على العلبة/الكيس كجزء من القصة وليس كديكور عابر.'
    },
    'box-reveal': {
      visual: 'مشهد فتح علبة الطلب إلزامي: علبة توصيل مفتوحة أو لحظة كشف واضحة، الطبق داخل العلبة أو خارجها مباشرة والغطاء ظاهر.',
      composition: 'اجعل العلبة والغطاء والطعام مثلث المشهد الرئيسي؛ لا تضع الطبق وحده على طاولة وكأن العلبة غير موجودة.',
      mustShow: 'يجب أن تظهر العلبة المفتوحة أو الغطاء المفتوح بوضوح، مع الطعام مكشوفًا بطريقة شهية ونظيفة.',
      avoid: 'ممنوع طبق عادي بدون علبة، ممنوع يد كاملة مع أصابع معقدة، ممنوع فوضى مناديل أو علب كثيرة.',
      reel: 'للريل: بداية أو منتصف اللقطة يجب أن يحمل لحظة كشف العلبة؛ اليد إن ظهرت تكون جزئية جدًا وطبيعية، أو تكون العلبة مفتوحة أصلًا.'
    },
    'home-rice-tray': {
      visual: 'صينية عيوش للبيت: مجبوس/مربين/عيش وسمك أو طبق رئيسي على سفرة بيتية كويتية نظيفة وهادئة.',
      composition: 'زاوية علوية أو 45 درجة، الصحن أو الصينية في الوسط، كمية مقنعة للعائلة بدون مبالغة.',
      mustShow: 'يجب أن يظهر إحساس البيت: طاولة بسيطة، ترتيب منزلي، طعام واضح ومركزي.',
      avoid: 'ممنوع ديكور تراثي مصطنع، مطعم فندقي، زحمة صحون جانبية، أو تغيير نوع البروتين.',
      reel: 'للريل: top-spread أو push-in بطيء على الصينية، بدون تحريك الطعام أو إضافة أطباق فجأة.'
    },
    'diwaniya-order': {
      visual: 'طلب ديوانية للربع: طلب جماعي مرتب في ديوانية عصرية بخلفية blur، الطعام واضح ويكفي المشاركة.',
      composition: 'لقطة table-pass أو زاوية واسعة مضبوطة، الطلب في الوسط والخلفية ديوانية هادئة غير مشتتة.',
      mustShow: 'يجب أن يظهر أنه طلب جماعي للربع: أكثر من علبة/طبق أو كمية مشاركة مع ترتيب نظيف.',
      avoid: 'ممنوع وجوه واضحة، دخان، شيشة، سدو زائد، زخرفة قديمة، أو عناصر سياسية/تعريفية.',
      reel: 'للريل: حركة جانبية قصيرة على الطلب الجماعي، مع تثبيت الطعام وعدم تغيير الكمية.'
    },
    'zowara-spread': {
      visual: 'سفرة زوارة: أطباق عائلية أو محاشي/ورق عنب/صواني داخل بيت، إحساس ضيافة مرتب لا زحمة.',
      composition: 'المنتج أو الطبق الرئيسي يبقى واضحًا، مع عناصر عائلية خفيفة في الأطراف لا تسرق التركيز.',
      mustShow: 'يجب أن يظهر إحساس الزوارة: سفرة بيتية، ضيافة، ترتيب عائلي نظيف، بدون وجوه.',
      avoid: 'ممنوع تحويلها إلى عرس، بوفيه ضخم، مطعم، أو إضافة أطباق غير مرتبطة بالفكرة.',
      reel: 'للريل: لقطة top-spread أو table-pass على السفرة، لا تدخل وجوه أو أيادٍ كثيرة.'
    },
    'floor-spread-overhead': {
      visual: 'سفرة أرضية من فوق: top-down حقيقي على بساط/سجادة نظيفة، المنتج بالوسط وأطراف الجالسين فقط حوله.',
      composition: 'زاوية علوية دقيقة، مفرش أو سفرة في المركز، توازن دائري حول الطبق، بدون وجوه ولا تفاصيل تعريفية.',
      mustShow: 'يجب أن يظهر أنها سفرة أرضية كويتية من فوق، لا طاولة مطعم ولا إعلان استوديو.',
      avoid: 'ممنوع وجوه، أجسام كاملة، فوضى أرضية، زخارف مبالغ فيها، أو أكل مبعثر.',
      reel: 'للريل: drift علوي خفيف جدًا أو zoom بسيط؛ لا تحرك الناس ولا تجعلها لقطة مطعم.'
    },
    'chalet-weekend-order': {
      visual: 'طلب الشاليه: طاولة بسيطة في شاليه كويتي، ضوء نهاري أو غروب ناعم، طلب ويكند مرتب.',
      composition: 'الطعام في المقدمة، الخلفية توحي بالشاليه بشكل خفيف blur دون أن تصبح سياحية.',
      mustShow: 'يجب أن يظهر إحساس الويكند والطلب العملي: طاولة نظيفة، أجواء مفتوحة، طعام واضح.',
      avoid: 'ممنوع بحر مبالغ، قوارب، ناس واضحة، مشهد سياحي، أو ديكور يصرف النظر عن الطبق.',
      reel: 'للريل: table-pass أو push-in على الطلب، مع ضوء غروب أو نهار بسيط، بدون استعراض مكان.'
    },
    'farm-clean-table': {
      visual: 'طلب المزرعة: طاولة خارجية نظيفة تحت ظل طبيعي، إحساس مزرعة هادئة ومرتبة.',
      composition: 'ضع الطعام واضحًا على طاولة مستقرة، والخلفية خضراء/ظل طبيعي blur بشكل بسيط.',
      mustShow: 'يجب أن تظهر طاولة خارجية نظيفة وطلب مناسب للطلعة، لا فوضى ولا مخيم.',
      avoid: 'ممنوع خيام تراثية، تراب، حيوانات، مخلفات، نار، أو عناصر كثيرة خارج موضوع الطعام.',
      reel: 'للريل: مرور قصير على الطاولة الخارجية، الطعام ثابت والخلفية لا تسيطر.'
    },
    'jakhour-clean-order': {
      visual: 'طلب الجاخور: قعدة عملية نظيفة للربع، طاولة مرتبة وخلفية جاخور blur بحذر شديد.',
      composition: 'الطعام والعلب في المركز، الخلفية مجرد إيحاء خفيف بالمكان لا تفاصيل مزعجة.',
      mustShow: 'يجب أن يظهر طلب عملي مرتب، مناسب لجلسة ربع، مع نظافة عالية.',
      avoid: 'ممنوع حيوانات، تراب، مخلفات، نار، فوضى، أو أي مشهد يقلل شهية الطعام.',
      reel: 'للريل: table-pass قصير على الطلب، بدون كشف محيط الجاخور بشكل مفصل.'
    },
    'late-night-craving': {
      visual: 'جوع آخر الليل: لقطة قريبة دافئة لطلب يفتح النفس، إضاءة منزلية ليلية ناعمة.',
      composition: 'الطبق قريب وواضح، الخلفية داكنة قليلًا ونظيفة، الإحساس سريع وشهي لا درامي زائد.',
      mustShow: 'يجب أن يظهر إحساس طلب آخر الليل: قرب، دفء، بساطة، وجاهزية للأكل.',
      avoid: 'ممنوع فوضى، ألوان نيون مبالغ فيها، غرفة نوم، أو مؤثرات غير واقعية.',
      reel: 'للريل: push-in قصير أو texture-close، أول ثانيتين تبيع الشهية فورًا.'
    },
    'family-lunch': {
      visual: 'غداء البيت: سفرة بيتية وقت الظهر، طبق رئيسي أو طلب عائلي في الوسط بإضاءة طبيعية.',
      composition: 'زاوية واسعة معتدلة أو علوية، تظهر الكمية بصدق وتبقي الطبق الرئيسي بطل المشهد.',
      mustShow: 'يجب أن يظهر إحساس الغداء العائلي النظيف: طعام كافٍ، ترتيب، بيت لا مطعم.',
      avoid: 'ممنوع وجوه واضحة، زحمة صحون، ديكور ثقيل، أو تغيير الطبق حسب المشهد.',
      reel: 'للريل: top-spread أو table-pass هادئ على السفرة، بدون إدخال أطباق عشوائية.'
    },
    'diwaniya-share': {
      visual: 'لقطة المشاركة: طلب واضح في الوسط مناسب للربع، إحساس مشاركة بدون أشخاص واضحين.',
      composition: 'أطراف بسيطة أو أكواب نظيفة مسموحة، لكن الطعام هو المركز، والخلفية ديوانية blur.',
      mustShow: 'يجب أن يظهر أن الطلب للمشاركة: كمية جماعية، ترتيب، مساحة حول الطبق.',
      avoid: 'ممنوع أيادٍ كثيرة، وجوه، دخان، أو إضافة صحون غير منطقية.',
      reel: 'للريل: table-pass أو حركة خفيفة حول الطلب، بدون تغيير التكوين أثناء الفيديو.'
    },
    'gift-ready-order': {
      visual: 'طلب يبيض الوجه: تغليف مرتب وفاخر بشكل مقيد، مناسب لهدية أو زوارة، المنتج واضح وليس مغلفًا بالكامل.',
      composition: 'التغليف يدعم الطعام ولا يخفيه؛ لقطة نظيفة، ألوان هادئة، مساحة سلبية فاخرة.',
      mustShow: 'يجب أن يظهر عنصر التغليف الراقي أو التقديم المهذب مع الطعام/الطلب.',
      avoid: 'ممنوع ديكور زائد، ورد مبالغ، هدايا كثيرة، علب تخفي المنتج، أو نصوص داخل الصورة.',
      reel: 'للريل: push-in على التغليف والطلب، ثم تثبيت على المنتج، بدون فتح معقد.'
    },
    'food-detail': {
      visual: 'تفاصيل الطبق: لقطة قريبة جدًا للملمس والمكونات الحقيقية: رز، لحم، سمك، محاشي أو ورق عنب.',
      composition: 'املأ الإطار بالتفاصيل الشهية مع عمق ميدان بسيط، لا تقطع الطبق بطريقة غريبة.',
      mustShow: 'يجب أن تظهر مادة الطعام نفسها بوضوح: الحبات، اللون، اللمعة الطبيعية، التتبيل الحقيقي.',
      avoid: 'ممنوع صوص طائر، بخار مبالغ، إضافات غير موجودة، تغيير مكونات، أو خلفية كثيرة.',
      reel: 'للريل: texture-close أو slow push، حركة صغيرة جدًا على الملمس فقط.'
    },
    'kuwait-towers-evening': {
      visual: `${KUWAIT_TOWERS_STRICT_REFERENCE_LOCK} أبراج الكويت تظهر كمعلم حقيقي في الخلفية فقط، والطلب/الطبق في المقدمة هو البطل. لا تستخدم أيقونة أو لوقو أو رسم صغير أو برج أحمر.`,
      composition: 'ضع الطعام على طاولة خارجية نظيفة أو سطح تقديم بسيط؛ الأبراج في الثلث الخلفي بعيدًا عن المنتج مع عمق ميدان واقعي، لكن تبقى دقيقة ومعروفة: البرج الرئيسي بكرَتين، الثاني بكرَة، الثالث إبرة بلا كرات.',
      mustShow: 'يجب أن تظهر أبراج الكويت الحقيقية كخلفية معمارية واضحة الهوية: 3 أبراج فقط، البرج الأكبر بكرَتين، الثاني بكرَة واحدة، الثالث إبرة بلا كرات، كرات فسيفساء زرقاء/خضراء/تركوازية، واجهة بحرية كويتية. المنتج حاد ومركزي في المقدمة.',
      avoid: 'ممنوع تحويلها لصورة سياحية للأبراج، ممنوع أي لوقو/أيقونة/ملصق، ممنوع 3 أبراج متطابقة، ممنوع كرة واحدة على كل برج، ممنوع إخفاء الكرة الثانية على البرج الرئيسي، ممنوع حذف برج الإبرة، ممنوع أبراج إضافية، ممنوع برج التحرير أو برج خليفة أو أبراج دبي أو قباب مساجد أو معالم سعودية أو أبراج خيالية أو كرتونية أو مشوهة، وممنوع أن تختفي الأكلة أمام المعلم.',
      reel: `للريل: ${KUWAIT_TOWERS_STRICT_REFERENCE_LOCK} الحركة على الطعام أو الطلب، لكن أبراج الكويت الحقيقية يجب أن تبقى كخلفية معمارية صحيحة ومميزة. لا تستخدم أيقونة أو رسم للأبراج داخل الفيديو.`
    },
    'mubarakiya-souk': {
      visual: 'سوق المباركية: أجواء سوق شعبي كويتي دافئة في الخلفية blur، إضاءة محلات ناعمة، والطلب في المقدمة بنظافة عالية.',
      composition: 'الطعام أو العلبة في المقدمة على سطح بسيط؛ خلفية السوق بعيدة وغير مقروءة، بدون زحمة وجوه أو لافتات واضحة.',
      mustShow: 'يجب أن يظهر إحساس المباركية: دفء شعبي كويتي وخلفية سوق blur، مع المنتج واضحًا كطلب عصري مرتب.',
      avoid: 'ممنوع وجوه واضحة، نصوص مقروءة، لافتات، ازدحام سوق يسرق المنتج، أو تحويل المشهد إلى مطعم شعبي قديم.',
      reel: 'للريل: table-pass قصير على الطلب مع إضاءة سوق دافئة في الخلف؛ لا تجعل السوق هو القصة بدل المنتج.'
    },
    'bidaa-coast': {
      visual: 'شاطئ البدع: طاولة طلب هادئة على الساحل وقت الغروب، البحر أو الرمل يظهران blur كخلفية راقية والمنتج في المقدمة.',
      composition: 'المنتج قريب وواضح على طاولة مستقرة، الخلفية الساحلية ناعمة جدًا، ألوان نظيفة ومنعشة بدون مبالغة.',
      mustShow: 'يجب أن يظهر إحساس ساحل البدع أو الجو البحري الكويتي بطريقة هادئة، مع بقاء الطلب صالحًا للتسويق.',
      avoid: 'ممنوع تحويلها لإعلان سياحي، ممنوع أشخاص بملابس بحر، قوارب كثيرة، أو بحر يطغى على المنتج.',
      reel: 'للريل: حركة جانبية أو اقتراب بسيط على الطلب مع ضوء غروب بحري blur، لا تستعرض الشاطئ أكثر من الطعام.'
    }
  };

  const SHOT_PRODUCTION_GUIDES: Record<string, string> = {
    'hero-push': 'تعليمات اللقطة: اقتراب بطيء ثابت على بطل المشهد؛ المنتج يكبر داخل الكادر بدون تبديل مكونات أو إضافة عناصر.',
    'box-open': 'تعليمات اللقطة: فتح/كشف علبة التوصيل هو الحدث الأساسي؛ العلبة والغطاء والطعام يجب أن يظهروا بوضوح طوال اللقطة.',
    'table-pass': 'تعليمات اللقطة: مرور جانبي هادئ على سفرة أو طاولة؛ لا تظهر أطباق جديدة فجأة ولا تتغير أماكن الطعام.',
    'floor-spread-overhead': 'تعليمات اللقطة: زاوية علوية حقيقية لسفرة أرضية؛ المنتج في الوسط وأطراف الجالسين فقط بدون وجوه.',
    'top-spread': 'تعليمات اللقطة: لقطة من فوق لسفرة مرتبة؛ الحركة إن وجدت تكون zoom أو drift خفيف جدًا.',
    'steam-close': 'تعليمات اللقطة: بخار طبيعي خفيف للأطباق الحارة فقط؛ ممنوع استخدامه إذا كان المنتج باردًا أو داخل تغليف.',
    'texture-close': 'تعليمات اللقطة: لقطة قريبة للملمس الحقيقي؛ ركز على القوام ولا تضف صوص أو مكونات غير موجودة.'
  };

  const getSceneProductionGuide = (scene = activeStudioScene): StudioSceneProductionGuide => {
    const directGuide = SCENE_PRODUCTION_GUIDES[scene.id];
    if (directGuide) return directGuide;
    const campaignGuide = KUWAIT_SEASON_CAMPAIGNS.find((campaign) => campaign.id === scene.id);
    if (campaignGuide) {
      return {
        visual: `رادار المواسم: ${campaignGuide.title}. ${campaignGuide.visualPromptAddition}`,
        composition: `المشهد الموسمي يجب أن يدعم المنتج ولا يسرق التركيز. المكان الافتراضي: ${KUWAIT_PLACES[campaignGuide.place]?.label || campaignGuide.place}. الإضاءة: ${campaignGuide.mood}.`,
        mustShow: `يجب أن يظهر أثر الموسم المختار بوضوح وهدوء: ${campaignGuide.desc}`,
        avoid: 'ممنوع تحويل الموسم إلى ديكور زائد، ممنوع نصوص داخل الصورة، ممنوع وجوه واضحة، ممنوع فوانيس/سدو/دلة/بخور إلا إذا كانت جزءًا حقيقيًا لا يطغى، والأصل تجنبها للحفاظ على نظافة المنتج.',
        reel: `للريل: حركة واحدة قصيرة تثبت المنتج وتلمّح للموسم فقط. الإيقاع المقترح: ${campaignGuide.soundscapeSuggestion}`
      };
    }
    return SCENE_PRODUCTION_GUIDES['delivery-ready'];
  };
  const sceneDirectorLock = (scene = activeStudioScene) => {
    const guide = getSceneProductionGuide(scene);
    return [
      `Scene lock: ${scene.label}. Background preset: ${scene.background}. Place: ${KUWAIT_PLACES[scene.place as KuwaitOrderPlace]?.label || scene.place}.`,
      guide.visual,
      guide.composition,
      `إلزامي: ${guide.mustShow}`,
      `تجنب: ${guide.avoid}`,
      guide.reel
    ].filter(Boolean).join(' ');
  };
  const SHOT_ALIAS_MAP: Record<string, string> = {
    'elevated-flat': 'top-spread',
    'macro-reveal': 'texture-close',
    'delivery-box': 'box-open',
    'wide-table': 'table-pass'
  };
  const normalizeShotId = (shotId = reelShot) => SHOT_PRODUCTION_GUIDES[shotId] ? shotId : (SHOT_ALIAS_MAP[shotId] || 'hero-push');
  const shotDirectorLock = (shotId = reelShot) => SHOT_PRODUCTION_GUIDES[normalizeShotId(shotId)] || SHOT_PRODUCTION_GUIDES['hero-push'];

  const FLOOR_SPREAD_OVERHEAD_DIRECTION = 'مشهد سفرة أرضية من فوق: استخدم زاوية top-down حقيقية من السقف أو درون داخلي، بساط أو سجادة نظيفة بنقشة هادئة، مفرش سفرة بسيط في الوسط، المنتج أو الصحن الرئيسي واضح في مركز التكوين، وأطراف أشخاص جالسين بلبس كويتي أبيض فقط حول السفرة بدون وجوه واضحة أو تفاصيل تعريفية. يجب أن يبدو كتصوير حقيقي ليمعة كويتية منزلية، لا إعلان مصطنع ولا مطعم ولا كافيه.';

  const isFloorSpreadScene = (scene: typeof mergedScenes[number]) => scene.id === 'floor-spread-overhead' || scene.background === 'floor-spread';

  const inferStudioChoicesFromText = (rawValue: string) => {
    const brain = analyzeAlturathStudioIdea(rawValue, data?.products || []);
    if (!brain.hasInput) return;

    const scene = mergedScenes.find((item) => item.id === brain.sceneId || item.background === brain.sceneId) || mergedScenes[0];
    setSelectedSceneId(scene.id);
    setSelectedPulseId(brain.pulseId);
    setSelectedOrderPlace(scene.place as KuwaitOrderPlace);
    setBackgroundPreset(scene.background as StudioBackgroundPresetId);
    setRealityMode(scene.mode as StudioRealityMode);
    setSelectedMood(brain.mood);
    setRealityBoost(true);
    setStrictPlateLock(true);
    setReelShot(SCENE_TO_REEL_SHOT[scene.id] || SHOT_ALIAS_MAP[brain.shotId] || brain.shotId || 'hero-push');
  };


  const handleStudioIdeaChange = (value: string) => {
    setCustomThemeQuery(value);
    setSelectedTheme(value.trim() ? 'مخصص' : 'نبض الكويت');
    inferStudioChoicesFromText(value);
  };

  const resetStudioSourceDraft = (options?: { clearImage?: boolean }) => {
    resetGeneratedOutput();
    setCustomThemeQuery('');
    setSelectedTheme('نبض الكويت');
    setSelectedStudioProductId('');
    setSelectedStudioCategoryId('');
    setStudioProductPickMode('smart');
    setShowStudioProductPicker(false);
    if (options?.clearImage) {
      setSelectedImage(null);
      setOriginalImage(null);
      setCompressedImage(null);
      setCompressionStats(null);
    }
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
  const [isDirectingStudio, setIsDirectingStudio] = useState(false);
  const [studioDirector, setStudioDirector] = useState<StudioDirectorResult | null>(null);
  const [isAuditingReel, setIsAuditingReel] = useState(false);
  const [reelAudit, setReelAudit] = useState<RealityAuditResult | null>(null);
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
      desc: 'ارفع الصورة واضغط أطلق الإبداع. نضبط الإضاءة والواقعية بدون قرارات كثيرة.',
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

  const seasonCampaignScenes = KUWAIT_SEASON_CAMPAIGNS.map((campaign) => ({
    id: campaign.id,
    label: campaign.title,
    desc: campaign.desc,
    icon: campaign.icon,
    place: campaign.place,
    mode: campaign.realityMode,
    background: campaign.background
  }));
  const studioSceneChoices = [...mergedScenes, ...seasonCampaignScenes];
  const nowForSeasonRadar = new Date();
  const currentMonthForSeasonRadar = nowForSeasonRadar.getMonth() + 1;
  const currentDayForSeasonRadar = nowForSeasonRadar.getDay();
  const isWeekendForSeasonRadar = currentDayForSeasonRadar === 4 || currentDayForSeasonRadar === 5 || currentDayForSeasonRadar === 6;
  const getSeasonRadarScore = (campaign: SeasonCampaign) => {
    let score = 20;
    if (campaign.id === 'national-spirit' && currentMonthForSeasonRadar === 2) score += 80;
    if (campaign.id === 'summer-chalet' && currentMonthForSeasonRadar >= 5 && currentMonthForSeasonRadar <= 9) score += 70;
    if (campaign.id === 'winter-camp' && (currentMonthForSeasonRadar >= 11 || currentMonthForSeasonRadar <= 2)) score += 70;
    if (campaign.id === 'rainy-chill' && (currentMonthForSeasonRadar === 12 || currentMonthForSeasonRadar <= 2)) score += 55;
    if (campaign.id === 'ramadan-nights' && (currentMonthForSeasonRadar === 3 || currentMonthForSeasonRadar === 4)) score += 35;
    if (isWeekendForSeasonRadar && (campaign.id === 'summer-chalet' || campaign.id === 'winter-camp')) score += 18;
    if (campaign.place === selectedOrderPlace) score += 8;
    return Math.min(100, score);
  };
  const getSeasonRadarReason = (campaign: SeasonCampaign) => {
    if (campaign.id === 'national-spirit' && currentMonthForSeasonRadar === 2) return 'الأقرب الآن لفبراير والمناسبات الوطنية';
    if (campaign.id === 'summer-chalet' && currentMonthForSeasonRadar >= 5 && currentMonthForSeasonRadar <= 9) return 'مناسب لحر الصيف والشاليهات والطلبات الخفيفة';
    if (campaign.id === 'winter-camp' && (currentMonthForSeasonRadar >= 11 || currentMonthForSeasonRadar <= 2)) return 'مناسب للشتاء والبر والكشتات';
    if (campaign.id === 'rainy-chill' && (currentMonthForSeasonRadar === 12 || currentMonthForSeasonRadar <= 2)) return 'مناسب لأيام الغيم والمطر والأكلات الدافئة';
    if (campaign.id === 'ramadan-nights') return 'يُستخدم عند اقتراب رمضان أو الغبقات';
    if (isWeekendForSeasonRadar && campaign.place === 'chalet') return 'الويكند يقوّي هذا الاختيار';
    return 'اقتراح موسمي احتياطي حسب نوع الطلب والمكان';
  };
  const seasonRadarCards = [...KUWAIT_SEASON_CAMPAIGNS]
    .map((campaign) => ({ ...campaign, radarScore: getSeasonRadarScore(campaign), radarReason: getSeasonRadarReason(campaign) }))
    .sort((a, b) => b.radarScore - a.radarScore);

  const activePulsePack = getKuwaitPulsePack(selectedPulseId);
  const activeStudioScene = studioSceneChoices.find((scene) => scene.id === selectedSceneId) || mergedScenes[0];
  const activeSceneSummary = activeStudioScene.label;
  const isKuwaitTowersScene = (scene: any) => scene?.id === 'kuwait-towers-evening' || scene?.background === 'kuwait-towers' || scene?.place === 'towers';

  const renderKuwaitTowersMark = (size: 'sm' | 'lg' = 'sm') => {
    const isLarge = size === 'lg';
    return (
      <span
        className={cn(
          "relative overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 shadow-sm shrink-0 flex items-center justify-center",
          isLarge ? "h-24 w-24 rounded-[2rem]" : "h-12 w-12"
        )}
        title="أبراج الكويت — صورة مرجعية حقيقية"
        aria-label="أبراج الكويت"
      >
        <img
          src="/kuwait-towers-reference.jpg"
          alt="أبراج الكويت"
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) parent.textContent = 'أبراج';
          }}
        />
      </span>
    );
  };

  const renderSceneBadge = (scene: any, size: 'sm' | 'lg' = 'sm') => {
    const isLarge = size === 'lg';
    if (isKuwaitTowersScene(scene)) {
      return renderKuwaitTowersMark(size);
    }
    return (
      <span className={cn(
        "rounded-xl bg-slate-50 border border-slate-100/30 flex items-center justify-center shrink-0",
        isLarge ? "h-24 w-24 rounded-[2rem] text-6xl border-white/10 bg-white/10 shadow-sm border border-slate-200" : "p-2 text-xl"
      )}>
        {scene.icon}
      </span>
    );
  };

  const renderKuwaitPlaceIcon = (id: KuwaitOrderPlace, place: typeof KUWAIT_PLACES[KuwaitOrderPlace]) => {
    if (id === 'towers') return renderKuwaitTowersMark('sm');
    return <span className="text-xl">{place.icon}</span>;
  };

  const buildReelSceneContract = () => {
    const sceneGuide = getSceneProductionGuide(activeStudioScene);
    const shotGuide = shotDirectorLock(reelShot);
    const towersLock = isKuwaitTowersScene(activeStudioScene)
      ? `Kuwait Towers strict reference lock: ${KUWAIT_TOWERS_STRICT_REFERENCE_LOCK}`
      : '';
    const boxLock = activeStudioScene.id === 'box-reveal' || reelShot === 'box-open'
      ? 'Box reveal lock: the reel must show a delivery box/food container reveal. The lid/box edge must be visible. Do not output a normal plate-only table shot.'
      : '';
    return [
      `Reel scene contract: ${activeStudioScene.label}.`,
      `Shot contract: ${reelShot}. ${typeof shotGuide === 'string' ? shotGuide : ''}`,
      `Scene visual: ${sceneGuide.visual}`,
      `Must show: ${sceneGuide.mustShow}`,
      `Avoid: ${sceneGuide.avoid}`,
      `Reel behavior: ${sceneGuide.reel}`,
      towersLock,
      boxLock,
      'The reel must obey the selected scene and selected shot. Use one coherent shot only; do not ignore the selected scene.'
    ].filter(Boolean).join(' ');
  };

  const liveStudioCards = {
    image: {
      title: 'من صورة',
      output: 'يعيد إخراج نفس الطبق بصورة تسويقية جديدة بدون تكرار الصورة الأصلية',
      platform: selectedFormat === '9:16' ? 'ستوري وإنستغرام' : 'إنستغرام، واتساب، والمنيو',
      duration: 'جاهزة خلال جلسة توليد واحدة',
      timing: 'قبل وقت الطلب أو وقت الجوع',
      impact: 'قفل هوية الطبق + تحسين الخلفية والضوء'
    },
    idea: {
      title: 'من فكرة',
      output: 'ينتج صورة من وصفك مع مشهد كويتي مناسب',
      platform: 'إنستغرام وستوري وواتساب',
      duration: 'مناسب للمحتوى السريع والحملات',
      timing: 'قبل العروض أو بداية اليوم',
      impact: 'تحويل الفكرة إلى مشهد قابل للبيع'
    },
    reel: {
      title: 'ريل مباشر',
      output: 'ريل عمودي 9:16 بحركة كاميرا واحدة واقعية',
      platform: 'إنستغرام وتيك توك',
      duration: `${Math.min(8, Math.max(4, reelDuration))} ثواني`,
      timing: 'الأفضل وقت الجوع أو قبل الذروة',
      impact: 'تأثير سريع ومناسب للانتشار'
    }
  };

  const getSmartPublishingPlan = (kind: 'image' | 'idea' | 'reel') => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isReel = kind === 'reel';
    const isWeekend = [5, 6].includes(now.getDay());
    const fmt = (h: number, m = 0) => {
      const suffix = h < 12 ? 'صباحًا' : 'مساءً';
      const hh = h % 12 || 12;
      return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
    };
    const todayAt = (h: number, m = 0) => `اليوم ${fmt(h, m)}`;
    const tomorrowAt = (h: number, m = 0) => `غدًا ${fmt(h, m)}`;
    let primaryWindow = '';
    let nextStory = '';
    let nextPost = '';
    let whatsappWindow = '';
    let verdict = '';

    if (hour < 6) {
      primaryWindow = isReel ? todayAt(11, 15) : todayAt(10, 30);
      nextStory = todayAt(12, 45);
      nextPost = todayAt(18, 30);
      whatsappWindow = todayAt(19, 15);
      verdict = 'الفجر وقت تجهيز لا نشر؛ نؤجل الإطلاق إلى أول نافذة جوع حقيقية بدل نشره الآن.';
    } else if (hour < 10) {
      primaryWindow = todayAt(11, 30);
      nextStory = todayAt(13, 0);
      nextPost = todayAt(18, 45);
      whatsappWindow = todayAt(19, 30);
      verdict = 'الصباح مناسب للتحضير؛ أفضل نشر يكون قبل الغداء لا فورًا.';
    } else if (hour < 13) {
      primaryWindow = 'الآن مناسب قبل الغداء';
      nextStory = todayAt(Math.min(hour + 1, 14), minute);
      nextPost = todayAt(18, 45);
      whatsappWindow = todayAt(19, 30);
      verdict = 'هذه نافذة طلب قوية؛ انشر الآن ثم ادفع بستوري قريب.';
    } else if (hour < 17) {
      primaryWindow = todayAt(18, 0);
      nextStory = todayAt(19, 15);
      nextPost = tomorrowAt(11, 30);
      whatsappWindow = todayAt(20, 0);
      verdict = 'منتصف اليوم أهدأ؛ الأفضل تجهيز المحتوى لذروة العشاء.';
    } else if (hour < 21) {
      primaryWindow = 'الآن مناسب للعشاء';
      nextStory = todayAt(Math.min(hour + 1, 21), minute);
      nextPost = tomorrowAt(11, 30);
      whatsappWindow = todayAt(21, 15);
      verdict = 'هذه أقوى نافذة عشاء؛ لا تؤجل المحتوى كثيرًا.';
    } else {
      primaryWindow = isWeekend ? tomorrowAt(11, 30) : tomorrowAt(10, 45);
      nextStory = tomorrowAt(12, 45);
      nextPost = tomorrowAt(18, 30);
      whatsappWindow = tomorrowAt(19, 15);
      verdict = 'الوقت متأخر؛ الأفضل جدولة المحتوى بدل نشره في لحظة نوم الجمهور.';
    }

    return { primaryWindow, nextStory, nextPost, whatsappWindow, verdict };
  };

  const getLiveStudioIntelligence = (kind: 'image' | 'idea' | 'reel') => {
    const isReel = kind === 'reel';
    const isIdeaImage = !isReel && imageDirectSource === 'idea';
    const isPhotoImage = !isReel && imageDirectSource === 'image';
    const isReelFromPhoto = isReel && reelSource === 'image';
    const isReelFromIdea = isReel && reelSource === 'idea';
    const productLabel = selectedStudioProductName || currentStudioBrain.primaryProductName || customThemeQuery.trim() || 'الناتج الحالي';
    const activeShot = reelShots.find((shot) => shot.id === reelShot) || reelShots[0];
    const place = KUWAIT_PLACES[selectedOrderPlace] || KUWAIT_PLACES.delivery;
    const formatLabel = selectedFormat === '9:16' ? 'عمودي للستوري والريل' : selectedFormat === '1:1' ? 'مربع للمنشورات' : 'أفقي للعرض الواسع';
    const moodLabel = selectedMood === 'dramatic' ? 'درامي فاخر' : selectedMood === 'warm' ? 'دافئ وشهي' : selectedMood === 'bright' ? 'مشرق ونظيف' : 'متوازن وواقعي';
    const nextBestMove = isReel
      ? (isReelFromPhoto ? 'لا تنتج ريلًا ثانيًا بنفس الصورة الآن؛ الأفضل ستوري ثابت ثم عرض واتساب.' : 'استخدم الريل كافتتاحية، ثم اصنع صورة ثابتة من زاوية مختلفة لنفس الفكرة.')
      : (isPhotoImage ? 'لا تعيد نشر الصورة الأصلية؛ استخدم الناتج كبوست، ثم اصنع ريل بلقطة مختلفة.' : 'حوّل الفكرة الناجحة إلى ريل قصير، ثم ثبّت الهوية بصورة ثانية لاحقًا.');
    const audienceRead = isReel
      ? 'هذا الناتج يخاطب المشاهد السريع؛ أول ثانيتين هي لحظة البيع.'
      : (selectedFormat === '9:16' ? 'هذا الناتج مناسب للستوري؛ اجعل الرسالة قصيرة ومباشرة.' : 'هذا الناتج مناسب كبوست بيع؛ يحتاج عبارة طلب واضحة لا شرح طويل.');
    const timingPlan = getSmartPublishingPlan(kind);
    const publishingWindow = timingPlan.primaryWindow;
    const avoidMove = isReel
      ? 'تجنب إعادة نفس الحركة أو نفس زاوية الكاميرا في المنشور التالي.'
      : 'تجنب نشر صورة ثانية بنفس التكوين حتى لا يشعر العميل بالتكرار.';
    const directorVerdict = isReel
      ? `ريل ${isReelFromPhoto ? 'مبني على صورة منتج' : 'مبني على فكرة'} في مشهد ${place.label}؛ قوته في الحركة السريعة لا في كثرة التفاصيل.`
      : `صورة ${isIdeaImage ? 'مبنية على فكرة' : 'مبنية على صورة منتج'} بصيغة ${formatLabel}؛ قوتها في وضوح الطبق والطلب.`;
    const campaignSteps = isReel
      ? [
          [timingPlan.primaryWindow, `انشر الريل كافتتاحية لـ ${productLabel} مع عبارة طلب قصيرة.`],
          [timingPlan.nextStory, 'ستوري ثابت بصورة أو لقطة مقربة مع سؤال مباشر للطلب.'],
          [timingPlan.nextPost, `صورة ${isReelFromPhoto ? 'بزاوية مختلفة عن الصورة الأصلية' : 'من نفس الفكرة لكن بتكوين أهدأ'}.`],
          [timingPlan.whatsappWindow, 'رسالة واتساب مختصرة للطلبات الجماعية أو العائلية.']
        ]
      : [
          [timingPlan.primaryWindow, `انشر الصورة كبوست واضح لـ ${productLabel}.`],
          [timingPlan.nextStory, 'ستوري مختصر مع زر أو عبارة طلب مباشرة.'],
          [timingPlan.nextPost, `ريل قصير بلقطة ${activeShot.label} بدون تكرار نفس التكوين.`],
          [timingPlan.whatsappWindow, 'عرض واتساب مبني على نفس الصورة لكن بنص مختلف.']
        ];
    const actionCards = [
      { label: 'قراءة المخرج', value: directorVerdict },
      { label: 'الخطوة التالية', value: nextBestMove },
      { label: 'نافذة النشر', value: publishingWindow },
      { label: 'حكم التوقيت', value: timingPlan.verdict },
      { label: 'ما يجب تجنبه', value: avoidMove },
    ];
    const scoreChips = [
      isReel ? 'قوة الحركة عالية' : 'وضوح البيع مهم',
      `المشهد: ${place.label}`,
      `النبرة: ${moodLabel}`,
      audienceRead,
    ];
    return { productLabel, activeShot, formatLabel, actionCards, scoreChips, campaignSteps };
  };

  const renderLiveStudioCard = (kind: 'image' | 'idea' | 'reel') => {
    const card = liveStudioCards[kind];
    const isReel = kind === 'reel';
    const hasOutput = isReel ? Boolean(generatedReel) : Boolean(generatedImage || aiImage);
    if (!hasOutput) return null;

    const intelligence = getLiveStudioIntelligence(kind);

    return (
      <details className="group rounded-[20px] border border-slate-200 bg-white text-right text-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] ring-1 ring-inset ring-slate-900/5 overflow-hidden">
        <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 select-none">
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">الاستوديو الحي</div>
            <h4 className="mt-1 text-base font-black text-slate-900">مخرج تسويق ذكي بعد الإنتاج</h4>
            <p className="mt-1 text-[11px] font-bold text-slate-500">يفتح بعد الناتج فقط ويقترح الخطوة التالية حسب الصورة أو الريل.</p>
          </div>
          <span className="rounded-xl bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 text-[10px] font-black shadow-sm group-open:hidden transition-colors">فتح</span>
          <span className="rounded-xl bg-slate-100 text-slate-600 px-3 py-1.5 text-[10px] font-black hidden group-open:inline-flex transition-colors border border-transparent">إخفاء</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
            {[
              ['الناتج', isReel ? 'ريل جاهز للنشر' : card.output],
              ['المنصة', card.platform],
              ['مدة الاستخدام', isReel ? card.duration : '24-48 ساعة ثم زاوية جديدة'],
              ['أفضل وقت', card.timing],
              ['قوة التأثير', card.impact],
              ['صيغة القراءة', intelligence.formatLabel],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[14px] bg-slate-50 border border-slate-100 p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="text-[9px] font-black text-slate-400 mb-1">{label}</div>
                <div className="leading-5">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[16px] bg-indigo-50/50 border border-indigo-100/60 p-3 shadow-sm ring-1 ring-inset ring-indigo-900/5">
            <div className="text-[10px] font-black text-indigo-600 mb-2">توصية المخرج الآن</div>
            <div className="grid gap-2">
              {intelligence.actionCards.map((item) => (
                <div key={item.label} className="rounded-[12px] bg-white border border-indigo-100/40 px-3 py-2 text-[11px] font-bold text-indigo-900/80 leading-5 shadow-[0_1px_3px_rgba(99,102,241,0.04)]">
                  <span className="text-indigo-600">{item.label}: </span>{item.value}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {intelligence.scoreChips.map((chip) => (
              <span key={chip} className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-black text-slate-800/65">{chip}</span>
            ))}
          </div>
        </div>
      </details>
    );
  };

  const renderCampaignRecipe = (kind: 'image' | 'reel' = 'image') => {
    const intelligence = getLiveStudioIntelligence(kind);
    return (
      <details className="group rounded-3xl border border-amber-200 bg-amber-50 text-right shadow-sm overflow-hidden">
        <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 select-none">
          <div>
            <div className="text-[10px] font-black text-amber-600">وصفة الحملة</div>
            <h4 className="text-sm font-black text-slate-950">حوّل الناتج إلى خطة نشر قصيرة</h4>
            <p className="mt-1 text-[11px] font-bold text-slate-500">مغلقة افتراضيًا حتى يبقى الاستوديو نظيفًا.</p>
          </div>
          <Sparkles size={18} className="text-amber-600 group-open:hidden" />
          <span className="rounded-2xl bg-white text-amber-700 border border-amber-100 px-3 py-1 text-[10px] font-black hidden group-open:inline-flex">إخفاء</span>
        </summary>
        <div className="px-4 pb-4 grid sm:grid-cols-2 gap-2">
          {intelligence.campaignSteps.map(([when, action]) => (
            <div key={when} className="rounded-2xl bg-white border border-amber-100 p-3">
              <div className="text-[10px] font-black text-amber-600">{when}</div>
              <div className="mt-1 text-[11px] font-bold text-slate-700 leading-5">{action}</div>
            </div>
          ))}
        </div>
      </details>
    );
  };

  const applyStudioSceneChoice = (scene: typeof mergedScenes[number], closePanel: 'create' | 'product') => {
    setSelectedSceneId(scene.id);
    if (scene.id === 'national-day') setSelectedPulseId('national-day');
    setSelectedOrderPlace(scene.place as KuwaitOrderPlace);
    setBackgroundPreset(scene.background as StudioBackgroundPresetId);
    setRealityMode(scene.mode as StudioRealityMode);
    const linkedShot = SCENE_TO_REEL_SHOT[scene.id];
    if (linkedShot) setReelShot(linkedShot);
    if (isFloorSpreadScene(scene)) {
      setReelShot('floor-spread-overhead');
      setRealityBoost(true);
      setStrictPlateLock(true);
    }
    if (scene.id === 'box-reveal') {
      setReelShot('box-open');
      setRealityBoost(true);
      setStrictPlateLock(true);
    }
    setSelectedTheme('نبض الكويت');
    if (closePanel === 'create') setShowCreateOccasion(false);
    if (closePanel === 'product') setShowProductOccasion(false);
    toast.success(`تم اعتماد مشهد: ${scene.label}`);
  };

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
      sceneDirectorLock(activeStudioScene),
      shotDirectorLock(reelShot),
      isFloorSpreadScene(activeStudioScene) ? FLOOR_SPREAD_OVERHEAD_DIRECTION : '',
      `اختبار الالتزام بالمشهد: يجب أن يظهر أثر المشهد المختار بوضوح في الصورة أو الريل، ولا يبقى مجرد اسم داخل البرومبت. إذا كان المشهد فتح علبة، فالعلبة تظهر. إذا كان ديوانية، فالطلب جماعي بخلفية ديوانية blur. إذا كان تفصيل طبق، فالملمس هو البطل.`,
      `اختبار الواقعية الكويتية: الصورة يجب أن تبدو كطلب مطبخ كويتي حقيقي للتوصيل أو البيت، لا إعلان فندقي ولا مطعم جلوس ولا ديكور تراثي مصطنع.`,
      `اختبار البيع: المنتج واضح أولاً، الكمية مقنعة، التغليف/السفرة نظيف، ولا توجد عناصر تسرق الانتباه من الطبق.`
    ].filter(Boolean).join(' ');
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
      sceneDirectorLock(activeStudioScene),
      shotDirectorLock(reelShot),
      isMenuPhoto ? profile.menuModeHint : '',
      source === 'image'
        ? 'Original image direction mode: keep the product identity, main ingredients, quantity logic, and serving truth, but do not repeat the exact uploaded photo. Re-shoot it visually with a better angle, cleaner background, believable Kuwaiti light, and new composition.'
        : 'Text-to-image truth order: food identity first, realism second, delivery/menu clarity third, beauty fourth, creativity last.',
      'Dish-transform blocker: never let the scene, lighting, or aesthetic override the actual product identity. No protein swap, no recipe swap, no side-item invention, no decorative clutter.'
    ].filter(Boolean).join(' ');
  };

  const markCurrentStyleAsAvoided = () => {
    const signature = buildStudioSignature(selectedStudioProductName || currentStudioBrain.primaryProductName);
    pushStudioMemory(signature, 'avoid');
    recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme, format: selectedFormat, label: 'avoid-style', source: 'avoid-style', dishKey: selectedStudioProductName || currentStudioBrain.primaryProductName || customThemeQuery, scene: activeStudioScene.label, shot: reelShot });
    refreshStudioLearning();
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
    ) || mergedScenes.find(s => s.background === suggestion.background) || mergedScenes.find(s => s.place === place) || mergedScenes[0];
    
    setSelectedSceneId(matchingScene.id);
  };

  const applyStudioDirector = (director: StudioDirectorResult) => {
    const place = KUWAIT_PLACES[director.place] ? director.place : 'delivery';
    const pack = getKuwaitPulsePack(director.pulseId || 'quick-kuwait');
    setSelectedPulseId(pack.id);
    setSelectedOrderPlace(place);
    setBackgroundPreset(director.background || KUWAIT_PLACES[place].background);
    setRealityMode(director.mode || pack.mode || 'finalBoss');
    setSelectedMood(director.mood || 'دافئ');
    setSelectedTheme('نبض الكويت');
    setRealityBoost(true);
    setStrictPlateLock(true);
    if (director.format) setSelectedFormat(director.format);
    if (director.shot) setReelShot(director.shot);
    const matchingScene = mergedScenes.find((scene) =>
      scene.background === (director.background || KUWAIT_PLACES[place].background)
      || scene.place === place
    ) || mergedScenes[0];
    setSelectedSceneId(matchingScene.id);
    setStudioDirector(director);
  };

  const runStudioDirector = async (options?: { imageDataUrl?: string; source?: 'image' | 'idea' | 'reel' }) => {
    if (isDirectingStudio) return;
    const sourceImage = options?.imageDataUrl || selectedImage || compressedImage || originalImage || '';
    if (!sourceImage && !customThemeQuery.trim()) return;
    setIsDirectingStudio(true);
    try {
      const productHints = (data?.products || [])
        .slice(0, 80)
        .map((p: any) => [p?.name, p?.category, p?.description].filter(Boolean).join(' - '))
        .filter(Boolean);
      const imagePayload = sourceImage ? getDataImagePayload(sourceImage) : null;
      const response = await fetch('/api/smart-studio/live-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: imagePayload?.imageContent,
          mimeType: imagePayload?.mimeType,
          idea: customThemeQuery,
          source: options?.source || (sourceImage ? 'image' : 'idea'),
          productHints,
          current: {
            place: selectedOrderPlace,
            background: backgroundPreset,
            mode: realityMode,
            shot: reelShot,
            format: selectedFormat,
            mood: selectedMood,
          },
          tasteProfile: buildStudioTastePrompt()
        })
      });
      const director = await response.json().catch(() => null);
      if (!response.ok || !director) throw new Error(director?.error || 'director failed');
      applyStudioDirector(director as StudioDirectorResult);
      if (director?.directorNote || director?.reason) toast.success(director.directorNote || director.reason);
    } catch {
      toast.info('طبقنا أفضل إعدادات آمنة محلياً، والمخرج الذكي يرجع يحاول مع أول توليد.');
    } finally {
      setIsDirectingStudio(false);
    }
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
      runStudioDirector({ imageDataUrl, source: 'image' });
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
      setReelDirectSource('image');
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
          sceneId: activeStudioScene.id,
          sceneLabel: activeStudioScene.label,
          shotType: reelShot,
          directorSceneDirection: sceneDirectorLock(activeStudioScene),
          shotDirectorDirection: shotDirectorLock(reelShot),
          sceneProductionGuide: getSceneProductionGuide(activeStudioScene),
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
      if (resData?.simulated || resData?.fallbackOriginal) {
        throw new Error('الخادم رجّع الصورة الأصلية بدل توليد جديد؛ أوقفنا عرضها حتى لا تتكرر نفس صورتك.');
      }
      if (imageResult && typeof imageResult === 'string' && !imageResult.startsWith('http') && !imageResult.startsWith('data:')) {
        imageResult = `data:image/png;base64,${imageResult}`;
      }
      if (imageResult && sourceImage && imageResult === sourceImage) {
        throw new Error('الصورة الناتجة مطابقة للمصدر. أعدنا منع التكرار حتى يرجع الاستوديو يولّد إخراجاً جديداً فعلياً.');
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
        recordStudioTasteChoice({ mode: usedMode, background: usedBackground, theme: themeUsed, format: selectedFormat, label: variantOverride?.label || STUDIO_REALITY_MODES[usedMode].label, source: 'generated-image', dishKey: imageBrain.primaryProductName || selectedStudioProductName || customThemeQuery, scene: activeStudioScene.label, shot: reelShot });
        refreshStudioLearning();
        if (variantOverride?.label) {
          setRealityVariants(prev => [...prev, {
            label: variantOverride.label || STUDIO_REALITY_MODES[variantOverride.mode || realityMode].label,
            url: branded,
            mode: variantOverride.mode || realityMode,
            background: variantOverride.background || backgroundPreset
          }].slice(-4));
        }
        return branded;
      } else {
        toast.error("تم التوليد، بس رابط الصورة ما وصل بشكل مفهوم");
        return null;
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'KEY_REQUIRED') {
        alert("توليد الصور يحتاج مفتاح Gemini مدفوع ومفعّل من الإعدادات.");
      } else {
        alert("لم تكتمل عملية التوليد: " + err.message + ". لم نفقد إعداداتك، ويمكنك المحاولة مرة أخرى بعد التأكد من مزود الذكاء.");
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  };



  const generateKuwaitNoProduct = async () => {
    const ideaBrain = analyzeAlturathStudioIdea(customThemeQuery || selectedStudioProductName || activeStudioScene.label, data?.products || []);
    const productBrain = ideaBrain;
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
${isKuwaitTowersScene(activeStudioScene) ? KUWAIT_TOWERS_STRICT_REFERENCE_LOCK : ''}
Generate a believable Kuwaiti occasion / delivery / gathering image without requiring a product upload. The selected scene is mandatory: ${activeStudioScene.label}. ${sceneDirectorLock(activeStudioScene)} Make it look like a real photographed Kuwaiti order moment, suitable for menu/social/product use. No readable text inside the image. ${STUDIO_NEGATIVE_PROMPT}`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format: selectedFormat, realityBoost: true, sceneId: activeStudioScene.id, sceneLabel: activeStudioScene.label, shotType: reelShot, directorSceneDirection: sceneDirectorLock(activeStudioScene), shotDirectorDirection: shotDirectorLock(reelShot), sceneProductionGuide: getSceneProductionGuide(activeStudioScene), tasteProfile: buildStudioTastePrompt() })
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
      recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, label: 'kuwait-no-product', source: 'quick-no-product', dishKey: ideaBrain.primaryProductName || selectedStudioProductName || customThemeQuery, scene: activeStudioScene.label, shot: reelShot });
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

  const generateBestAutoAttempt = async () => {
    if (!selectedImage || isGenerating || isGeneratingVariants) return;
    setIsGeneratingVariants(true);
    setRealityVariants([]);
    setRealityAudit(null);
    const candidatePlan: { label: string; mode: StudioRealityMode; background: StudioBackgroundPresetId }[] = [
      { label: 'محاولة ذكية 1', mode: 'finalBoss', background: backgroundPreset || 'home-table' },
      { label: 'محاولة ذكية 2', mode: 'human', background: selectedOrderPlace === 'delivery' ? 'delivery-packaging' : 'home-table' },
      { label: 'محاولة ذكية 3', mode: 'menu', background: backgroundPreset === 'floor-spread' ? 'floor-spread' : 'neutral-menu' },
    ];
    const previousImage = generatedImage;
    const previousAiImage = aiImage;
    let best: { url: string; score: number; audit: RealityAuditResult; label: string; mode: StudioRealityMode; background: StudioBackgroundPresetId } | null = null;
    try {
      for (const candidate of candidatePlan) {
        const current = await generateContent({ ...candidate, sourceImage: selectedImage });
        if (!current) continue;
        const payload = getDataImagePayload(current);
        const response = await fetch('/api/smart-studio/reality-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, publishGate: true, sourcePrompt: `${buildSettingsText()} / ${candidate.label}` })
        });
        const audit = await response.json().catch(() => null) as RealityAuditResult | null;
        const score = Number(audit?.score || 0);
        if (!best || score > best.score) best = { url: current, score, audit: audit || {}, label: candidate.label, mode: candidate.mode, background: candidate.background };
      }
      if (best) {
        setAiImage(best.url);
        const branded = await applyBranding(best.url).catch(() => best.url);
        setGeneratedImage(branded);
        setRealityAudit(best.audit);
        setRealityVariants(prev => [{ label: `الأفضل ${Math.round(best!.score)}%`, url: branded, mode: best!.mode, background: best!.background }, ...prev].slice(0, 4));
        recordStudioTasteChoice({ mode: best.mode, background: best.background, theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme, format: selectedFormat, label: 'best-auto-attempt', source: 'best-auto-attempt', dishKey: customThemeQuery || selectedStudioProductName, scene: activeStudioScene.label, shot: reelShot });
        toast.success(`اخترنا أفضل محاولة تلقائياً: ${Math.round(best.score)}%`);
      } else {
        setGeneratedImage(previousImage);
        setAiImage(previousAiImage);
        toast.error('ما قدرنا نحدد أفضل محاولة');
      }
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

  const ensureImagePublishQuality = async () => {
    const source = aiImage || generatedImage;
    if (!source) return false;
    if (realityAudit?.publishReady === true || (Number(realityAudit?.score || 0) >= 84 && realityAudit?.hasTextOrLogo !== true)) return true;
    setIsAuditingReality(true);
    try {
      const payload = getDataImagePayload(source);
      const response = await fetch('/api/smart-studio/reality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, publishGate: true, sourcePrompt: buildSettingsText() })
      });
      if (!response.ok) throw new Error('ما قدرنا نفحص جودة الصورة');
      const result = await response.json();
      setRealityAudit(result);
      const ready = result?.publishReady !== false && Number(result?.score || 0) >= 82 && result?.hasTextOrLogo !== true;
      if (!ready) {
        toast.error(result?.fixHint || 'الصورة تحتاج إعادة أصدق قبل التحميل.');
      }
      return ready;
    } catch (err: any) {
      toast.error(err?.message || 'ما قدرنا نفحص جودة الصورة');
      return false;
    } finally {
      setIsAuditingReality(false);
    }
  };

  const buildReelQualityPayload = () => {
    const payload: any = {
      prompt: buildReelPrompt(),
      settings: buildReelSettingsText(),
      source: reelSource,
      shotType: reelShot,
      sceneId: activeStudioScene.id,
      sceneLabel: activeStudioScene.label,
      directorSceneDirection: sceneDirectorLock(activeStudioScene),
      shotDirectorDirection: shotDirectorLock(reelShot),
      place: selectedOrderPlace,
      duration: reelDuration,
      tasteProfile: buildStudioTastePrompt()
    };
    if (selectedImage) {
      const imagePayload = getDataImagePayload(selectedImage);
      payload.sourceImageContent = imagePayload.imageContent;
      payload.sourceImageMimeType = imagePayload.mimeType;
    }
    if (generatedReel?.startsWith('data:') && generatedReel.length < 22_000_000) {
      const [header, data] = generatedReel.split(',');
      payload.videoContent = data;
      payload.videoMimeType = header?.split(';')[0]?.split(':')[1] || (generatedReel.startsWith('data:image') ? 'image/svg+xml' : 'video/mp4');
    }
    return payload;
  };

  const auditReelQuality = async () => {
    if (!generatedReel || isAuditingReel) return null;
    setIsAuditingReel(true);
    try {
      const response = await fetch('/api/smart-studio/reel-quality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildReelQualityPayload())
      });
      if (!response.ok) throw new Error('ما قدرنا نفحص جودة الريل');
      const result = await response.json();
      setReelAudit(result);
      toast.success(`فحص الريل: ${Math.round(Number(result.score || 0))}%`);
      return result as RealityAuditResult;
    } catch (err: any) {
      toast.error(err?.message || 'ما قدرنا نفحص جودة الريل');
      return null;
    } finally {
      setIsAuditingReel(false);
    }
  };

  const ensureReelPublishQuality = async () => {
    if (!generatedReel) return false;
    if (reelAudit?.publishReady === true || (Number(reelAudit?.score || 0) >= 84 && reelAudit?.hasTextOrLogo !== true)) return true;
    const result = await auditReelQuality();
    const ready = result?.publishReady !== false && Number(result?.score || 0) >= 82 && result?.hasTextOrLogo !== true;
    if (!ready) toast.error(result?.fixHint || 'الريل يحتاج إعادة أصدق قبل التحميل.');
    return ready;
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

  const handleDownload = async () => {
    if (!generatedImage && !aiImage) return;
    const ready = await ensureImagePublishQuality();
    if (!ready) return;
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
    const ready = await ensureImagePublishQuality();
    if (!ready) return;
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
      'box-open': 'مشهد فتح علبة الطلب إلزامي: يبدأ أو يظهر ككشف واضح لعلبة توصيل plain، الغطاء/العلبة ظاهران والطبق داخلها أو يُكشف منها، اليد إن ظهرت تكون جزئية وطبيعية جداً، بدون أصابع غريبة. لا تحوّلها إلى طبق ثابت على طاولة فقط.',
      'table-pass': 'حركة جانبية قصيرة على سفرة أو صينية مرتبة؛ الأطباق ثابتة ولا تظهر صحون جديدة فجأة.',
      'floor-spread-overhead': 'لقطة علوية ثابتة أو drift خفيف جداً فوق سفرة أرضية كويتية نظيفة؛ المنتج في الوسط وأطراف الجالسين حوله بدون وجوه واضحة.',
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
    const sceneDifferentiationLock = `قفل اختلاف الريل: لا تستخدم نفس ريل الزوم والصحن الافتراضي لكل الخيارات. هذا الريل يجب أن يثبت اختيار المستخدم بصرياً: المشهد المختار=${activeStudioScene.label}، المكان=${place.label}، اللقطة=${shot?.label || 'اقتراب على الطلب'}. إذا كان المشهد أبراج الكويت يجب أن تظهر أبراج الكويت الحقيقية كخلفية بعيدة blur. إذا كان المشهد المباركية يجب أن تظهر أجواء سوق المباركية الدافئة blur. إذا كان فتح علبة الطلب يجب أن تظهر العلبة والغطاء. إذا كانت اللقطة من فوق أو سفرة أرضية يجب أن تتغير الزاوية فعلاً ولا تبقى زوم أمامي.`;
    return `Reel عمودي 9:16 احترافي لمطبخ التراث الكويتي، نشاط مطبخ وتوصيل أكل كويتي وليس مطعم جلوس. فكرة مختصرة: ${idea}. نوع اللقطة: ${shot?.label || 'اقتراب على الطلب'} — ${shotGuide[reelShot] || shotGuide['hero-push']} ${shotDirectorLock(reelShot)}. المكان: ${place.label} — ${placeGuide[selectedOrderPlace] || placeGuide.delivery}. ${sceneDifferentiationLock} ${sceneDirectorLock(activeStudioScene)} ${buildReelSceneContract()} ${buildDirectorDirection(brain)} ${buildAdvancedStudioDirection(brain, { source: 'reel' })} ${buildNoRepeatDirection()} مدة ${Math.min(8, Math.max(4, reelDuration))} ثواني. المطلوب لقطة واحدة واقعية جداً، حركة كاميرا ناعمة وثابتة، الطعام واضح ومثبت في المنتصف، لا يتغير شكل الطبق أو الكمية أو المكونات عبر الفيديو. حافظ على الطبق والتغليف كما هما إذا كان المصدر صورة، لكن لا تلغِ المشهد المختار: البيئة المختارة تظهر كخلفية أو زاوية واضحة بدون أن تسرق المنتج. تكوين بصري نظيف وإضاءة شهية واقعية. ممنوع وجوه واضحة، شخص يتكلم، شفاه، نصوص، شعارات، دلة، قهوة، بخور، سدو، فوانيس، سيارة توصيل، مطعم جلوس، كافيه، كلينكس مستخدم، فوضى، صحون تظهر فجأة، صوص يطير، أو أي حركة غير منطقية. إضاءة ${selectedMood}. وصفة الريل الذكية حسب الطبق: ${brain.reelRecipe.join('، ')}. ${brain.promptGuard}`;
  };

  const buildReelSettingsText = (item?: Partial<StudioReelHistoryItem>) => {
    const shot = reelShots.find((s) => s.id === (item?.shot || reelShot));
    const placeId = item?.place || selectedOrderPlace;
    const sourceLabel = item?.source
      ? (item.source === 'image' ? 'من صورة' : 'من فكرة')
      : reelDirectSource === 'menu'
        ? 'من المنيو'
        : reelSource === 'image'
          ? 'من صورة'
          : 'من فكرة';
    return [
      `المسار: ريل قصير`,
      `المصدر: ${sourceLabel}`,
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
          className="h-9 w-9 rounded-2xl border border-white/15 bg-white border border-slate-200 text-slate-900/80 text-white/90 shadow-sm border border-slate-200 backdrop-blur-xl flex items-center justify-center text-[13px] font-black hover:bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label={isOpen ? 'إخفاء تفاصيل الإنتاج' : 'إظهار تفاصيل الإنتاج'}
          title={isOpen ? 'إخفاء تفاصيل الإنتاج' : 'إظهار تفاصيل الإنتاج'}
        >
          i
        </button>

        {isOpen && (
          <aside className="absolute bottom-11 right-0 w-[min(17rem,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-slate-50 border border-slate-200 text-slate-900/90 p-3 text-white shadow-2xl backdrop-blur-2xl">
            <div className="mb-2 flex items-center justify-between gap-3" dir="ltr">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">{mode === 'reel' ? 'تفاصيل الريل' : 'تفاصيل الإنتاج'}</span>
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

  const returnReelToSourceStep = (message: string) => {
    setReelSubTab('generate');
    setReelStep(1);
    toast.error(message, {
      description: 'رجعناك مباشرة لمرحلة البداية حتى تختار صورة أو تكتب فكرة بدون الضغط على رجوع أكثر من مرة.'
    });
  };

  const hasValidReelSource = () => {
    if (reelSource === 'image') return Boolean(selectedImage);
    return Boolean(customThemeQuery.trim() || selectedStudioProductName);
  };

  const goBackFromReelFinalStep = () => {
    if (!hasValidReelSource()) {
      setReelStep(1);
      return;
    }
    setReelStep(3);
  };

  const generateReel = async () => {
    const productBrain = ensureAlturathProductOnly({ imageOnly: reelSource === 'image' });
    if (!productBrain) return;
    if (!customThemeQuery.trim() && !selectedStudioProductName && reelSource === 'idea') {
      returnReelToSourceStep('اكتب فكرة قصيرة للريل أو اختر من صورة');
      return;
    }
    if (reelSource === 'image' && !selectedImage) {
      returnReelToSourceStep('ارفع صورة للطبق أولاً');
      return;
    }
    setIsGeneratingReel(true);
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelAudit(null);
    try {
      const isImageReel = reelSource === 'image';
      const payload: any = {
        prompt: buildReelPrompt(),
        duration: Math.min(8, Math.max(4, reelDuration)),
        shotType: reelShot,
        format: '9:16',
        resolution: '540x960',
        targetResolution: '540x960',
        sourceType: reelSource,
        quality: isImageReel ? 'plate-lock' : 'fast-realistic',
        renderMode: isImageReel ? 'image-to-video-plate-lock' : 'text-to-video-fast-realistic',
        compression: 'balanced',
        bitrate: isImageReel ? '1800k' : '1200k',
        fps: 24,
        audio: false,
        voiceover: false,
        noTalking: true,
        tokenBudget: isImageReel ? 'medium' : 'low',
        place: selectedOrderPlace,
        mood: selectedMood,
        tasteProfile: buildStudioTastePrompt(),
        productOnlyGuard: productBrain.promptGuard,
        dishLock: isImageReel ? 'strict-source-image-identity' : 'truth-first-generated-food',
        sceneId: activeStudioScene.id,
        sceneLabel: activeStudioScene.label,
        directorSceneDirection: sceneDirectorLock(activeStudioScene),
        shotDirectorDirection: shotDirectorLock(reelShot),
        sceneProductionGuide: getSceneProductionGuide(activeStudioScene),
        reelSceneContract: buildReelSceneContract(),
        visualVariationKey: `${activeStudioScene.id}-${reelShot}-${selectedOrderPlace}`,
        forceSceneDifferentiation: true,
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
      recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme, format: '9:16', label: reelShot, source: 'generated-reel', dishKey: productBrain.primaryProductName || selectedStudioProductName || customThemeQuery, scene: activeStudioScene.label, shot: reelShot });
      toast.success('الريل جاهز وخفيف ومحفوظ في أرشيف الريلز');
    } catch (e: any) {
      toast.error(e?.message || 'ما قدرنا نولّد الريل الحين');
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const downloadReel = async () => {
    if (!generatedReel) return;
    const ready = await ensureReelPublishQuality();
    if (!ready) return;
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
    if (['steam-close', 'texture-close', 'box-open', 'top-spread', 'floor-spread-overhead'].includes(reelShot)) score += 4;
    if (brain.category !== 'generic') score += 5;
    score += Math.round((profile.deliverySuitability.value - 80) / 4);
    score += Math.round((profile.clutterRisk.value - 80) / 6);
    if (studioGenerationMemory.includes(buildStudioSignature(brain.primaryProductName || selectedStudioProductName))) score -= 6;
    return Math.max(50, Math.min(96, Math.round(score)));
  };

  const renderAlturathBrainCard = (context: 'image' | 'reel' = 'image') => {
    const hasImageSource = Boolean(selectedImage) && (context === 'image' || context === 'reel');
    const brain: AlturathStudioBrainResult = hasImageSource ? analyzeAlturathStudioIdea(customThemeQuery, studioProducts) : currentStudioBrain;
    const activeScene = studioSceneChoices.find(scene => scene.id === selectedSceneId) || mergedScenes[0];
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

    if (!brain.hasInput && !hasImageSource && productSuggestions.length === 0 && studioProductGroups.length === 0) return null;

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

        {(isDirectingStudio || studioDirector?.directorNote || studioDirector?.reason) && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-800 leading-6">
            {isDirectingStudio ? 'المخرج الذكي يضبط المشهد واللقطة...' : (studioDirector?.directorNote || studioDirector?.reason)}
          </div>
        )}

        {!brain.canGenerate && (
          <div className="rounded-2xl border p-3 text-[11px] font-black leading-6 bg-red-50 border-red-200 text-red-700">
            {brain.productGuardMessage}
            <div className="mt-1 text-[10px] text-red-500">طبق جديد؟ أضفه للمنيو أولاً.</div>
          </div>
        )}

        {shouldShowImageProductLink && (
          <button
            type="button"
            onClick={() => { setStudioProductPickMode('manual'); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); setShowStudioProductPicker(true); }}
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
                {selectedStudioProductName && <div className="rounded-2xl bg-indigo-600 text-white px-3 py-2 text-[10px] font-black max-w-[150px] truncate">{selectedStudioProductName}</div>}
                <div className="rounded-full bg-slate-100 p-2">
                  <ChevronLeft className={cn("w-4 h-4 text-slate-500 transition-transform", showStudioProductPicker ? "-rotate-90" : "rotate-0")} />
                </div>
              </div>
            </button>

            {showStudioProductPicker && (
              <div className="border-t border-slate-100 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1 border border-slate-100">
                  <button type="button" onClick={() => { setStudioProductPickMode('smart'); setSelectedStudioProductId(''); }} className={cn("rounded-xl px-3 py-2 text-[11px] font-black transition-all", studioProductPickMode === 'smart' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>ذكي تلقائي</button>
                  <button type="button" onClick={() => { setStudioProductPickMode('manual'); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); }} className={cn("rounded-xl px-3 py-2 text-[11px] font-black transition-all", studioProductPickMode === 'manual' ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white")}>أختار بنفسي</button>
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
                          <button key={product.id || name} type="button" onClick={() => { setSelectedStudioProductId(String(product.id || '')); setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); setShowStudioProductPicker(false); }} className={cn("rounded-2xl border p-3 text-right transition-all", isSelected ? "bg-emerald-50 border-emerald-400 ring-4 ring-emerald-500/10" : "bg-slate-50 border-slate-100 hover:bg-white hover:border-emerald-200")}>
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
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="rounded-[1.4rem] bg-gradient-to-br from-amber-50 to-orange-50/50 border border-[#C5A059]/30 p-4 relative overflow-hidden mt-4 shadow-sm"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 blur-xl rounded-full translate-x-12 -translate-y-12" />
            
            <div className="text-[11px] font-black text-amber-800 mb-3 flex items-center gap-2 z-10 relative">
               <Sparkles size={14} className="text-[#C5A059]" /> السرد البصري (Storytelling)
            </div>
            
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.8 } }
              }} 
              className="grid gap-3 z-10 relative"
            >
              {brain.reelRecipe.map((item, index) => (
                <motion.div 
                   key={item} 
                   variants={{
                     hidden: { opacity: 0.1, backgroundPosition: "200% 0", filter: "blur(2px)" },
                     visible: { 
                       opacity: 1, 
                       backgroundPosition: "-200% 0", 
                       filter: "blur(0px)",
                       transition: { duration: 2, ease: "easeOut" }
                     }
                   }}
                   style={{
                     backgroundSize: "200% auto",
                   }}
                   className="text-xs font-bold leading-relaxed border-r-[1.5px] border-[#C5A059]/40 pr-3 pb-1 text-transparent bg-clip-text bg-gradient-to-l from-amber-950 via-amber-700 to-[#C5A059] animate-[gradientGold_3s_ease]"
                >
                   {item}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
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
      <div className="rounded-[1.7rem] border border-slate-200/60 bg-slate-50/50 backdrop-blur-xl p-3 space-y-3 shadow-inner">
        <button
          type="button"
          onClick={() => setShowFineTools(!showFineTools)}
          className="w-full rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 p-4 text-right flex items-center justify-between gap-3 shadow-sm hover:bg-white/90 transition-all"
        >
          <span>
            <span className="block text-xs font-black text-slate-500 font-mono uppercase tracking-widest">أدوات دقيقة</span>
            <span className="block text-sm font-black text-slate-900 mt-1">افتحها فقط عند الحاجة للتعديل</span>
          </span>
          <ChevronLeft className={cn("transition-transform text-slate-400", showFineTools ? "-rotate-90" : "")} size={20} />
        </button>

        {showFineTools && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-2">
              {toolTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFineToolTab(tab.id)}
                  className={cn(
                    "rounded-2xl px-3 py-3 text-sm font-black transition-all flex items-center justify-center gap-2",
                    fineToolTab === tab.id ? "bg-indigo-600 text-white shadow-md transform scale-[0.99]" : "bg-white/60 backdrop-blur-md text-slate-500 border border-white/40 hover:bg-white/80"
                  )}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {fineToolTab === 'lighting' && (
              <div className="rounded-[1.5rem] border border-amber-900/10 bg-gradient-to-b from-white/90 to-white/50 backdrop-blur-xl p-4 shadow-sm">
                <p className="text-[11px] font-black text-amber-800 mb-3 font-mono">اختر إحساس الإضاءة</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {moods.map(m => (
                    <button key={m.id} type="button" onClick={() => setSelectedMood(m.id)} className={cn("p-3 rounded-[1.2rem] border flex items-center justify-between gap-2 transition-all active:scale-95", selectedMood === m.id ? "bg-amber-50/80 border-[#C5A059] text-amber-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_5px_rgba(197,160,89,0.2)] scale-[0.98]" : "bg-white/60 backdrop-blur-sm border-white/40 text-slate-600 hover:bg-white/90 active:scale-[0.98] hover:shadow-sm") }>
                      <span className="text-xl drop-shadow-sm">{m.icon}</span><span className="text-[11px] font-black">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fineToolTab === 'reality' && (
              <div className="rounded-[1.5rem] border border-emerald-900/10 bg-gradient-to-b from-white/90 to-white/50 backdrop-blur-xl p-4 shadow-sm">
                <p className="text-[11px] font-black text-emerald-800 mb-3 font-mono">أسلوب الصورة النهائي</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STUDIO_REALITY_MODES) as [StudioRealityMode, typeof STUDIO_REALITY_MODES[StudioRealityMode]][]).map(([id, item]) => (
                    <button key={id} type="button" onClick={() => setRealityMode(id)} className={cn("p-3 rounded-[1.2rem] border text-right transition-all active:scale-95", realityMode === id ? "bg-emerald-50/80 border-emerald-500/60 text-emerald-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_5px_rgba(16,185,129,0.2)] scale-[0.98]" : "bg-white/60 backdrop-blur-sm border-white/40 text-slate-600 hover:bg-white/90  hover:shadow-sm") }>
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
    <div className="rounded-[1.7rem] border border-slate-200/60 bg-slate-50/50 backdrop-blur-xl p-3 space-y-3 shadow-inner">
      <button
        type="button"
        onClick={() => setShowPlaceLibrary(!showPlaceLibrary)}
        className="w-full rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 p-4 text-right flex items-center justify-between gap-3 shadow-sm hover:bg-white/90 transition-all"
      >
        <span>
          <span className="block text-xs font-black text-slate-500 font-mono uppercase tracking-widest">مشاهد واقعية جاهزة</span>
          <span className="mt-1 flex items-center justify-end gap-2 text-sm font-black text-slate-900"><span>{KUWAIT_PLACES[selectedOrderPlace]?.label}</span>{selectedOrderPlace === 'towers' ? renderKuwaitTowersMark('sm') : <span className="drop-shadow-sm">{KUWAIT_PLACES[selectedOrderPlace]?.icon}</span>}</span>
        </span>
        <ChevronLeft className={cn("transition-transform text-slate-400", showPlaceLibrary ? "-rotate-90" : "")} size={20} />
      </button>
      {showPlaceLibrary && (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {(Object.entries(KUWAIT_PLACES) as [KuwaitOrderPlace, typeof KUWAIT_PLACES[KuwaitOrderPlace]][]).map(([id, place]) => (
            <button key={id} type="button" onClick={() => { setSelectedOrderPlace(id); setBackgroundPreset(place.background); setShowPlaceLibrary(false); }} className={cn("rounded-[1.2rem] border p-3 text-right transition-all min-h-[72px] active:scale-95", selectedOrderPlace === id ? "bg-slate-50 border border-slate-200 text-slate-900 text-white border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] scale-[0.98]" : "bg-white/60 backdrop-blur-sm text-slate-600 border-white/50 hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-sm") }>
              <span className="mx-auto mb-1 inline-flex drop-shadow-sm">{renderKuwaitPlaceIcon(id, place)}</span>
              <span className="block text-[11px] font-black mt-1">{place.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderQualityAuditCard = (kind: 'image' | 'reel') => {
    const audit = kind === 'image' ? realityAudit : reelAudit;
    const isBusy = kind === 'image' ? isAuditingReality : isAuditingReel;
    const runAudit = kind === 'image' ? auditReality : auditReelQuality;
    const score = Math.round(Number(audit?.score || 0));
    const ready = audit ? audit.publishReady !== false && score >= 82 && audit.hasTextOrLogo !== true : false;
    const subscores = audit?.subscores ? [
      ['ثبات الطبق', audit.subscores.dishLock],
      ['الواقعية', audit.subscores.realism],
      ['خلو النصوص', audit.subscores.textSafety],
      ['إنستغرام', audit.subscores.instagramFit],
      ['شهية المنتج', audit.subscores.appetite],
    ].filter(([, value]) => typeof value === 'number') as [string, number][] : [];
    return (
      <div className={cn("rounded-3xl border p-3 text-right shadow-sm", audit ? ready ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100" : "bg-white border-slate-100")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn("text-[11px] font-black", audit ? ready ? "text-emerald-700" : "text-amber-700" : "text-slate-500")}>
              {kind === 'image' ? 'فحص جودة الصورة' : 'فحص جودة الريل'}
            </div>
            <div className="mt-1 text-xs font-black text-slate-900 leading-6">
              {audit ? (audit.verdict || (ready ? 'جاهز للنشر' : 'يحتاج تحسين قبل النشر')) : 'يفحص المنتج، النصوص، الواقعية، وجاهزية إنستغرام قبل التحميل.'}
            </div>
          </div>
          {audit && <div className={cn("rounded-2xl px-3 py-2 text-xs font-black", ready ? "bg-emerald-600 text-white" : "bg-amber-500 text-white")}>{score}%</div>}
        </div>
        {audit?.notes?.length ? (
          <div className="mt-2 grid gap-1">
            {audit.notes.slice(0, 3).map((note) => <div key={note} className="text-[10px] font-bold text-slate-600 leading-5">{note}</div>)}
          </div>
        ) : null}
        {subscores.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {subscores.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/80 border border-white px-2 py-2 text-center">
                <div className="text-[9px] font-black text-slate-500">{label}</div>
                <div className="mt-1 text-xs font-black text-slate-900">{Math.round(value)}%</div>
              </div>
            ))}
          </div>
        )}
        {audit && !ready && audit.fixHint && <div className="mt-2 rounded-2xl bg-white/70 border border-white px-3 py-2 text-[10px] font-black text-amber-800 leading-5">{audit.fixHint}</div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => runAudit()} disabled={isBusy} className="rounded-2xl bg-slate-950 text-white px-3 py-2 text-[11px] font-black disabled:opacity-50">
            {isBusy ? 'نفحص...' : 'فحص الآن'}
          </button>
          {kind === 'image' && audit && !ready && (
            <button type="button" onClick={makeMoreHuman} disabled={isGenerating} className="rounded-2xl bg-white border border-amber-200 text-amber-700 px-3 py-2 text-[11px] font-black disabled:opacity-50">أعدها أصدق</button>
          )}
          {kind === 'reel' && audit && !ready && (
            <button type="button" onClick={generateReel} disabled={isGeneratingReel} className="rounded-2xl bg-white border border-amber-200 text-amber-700 px-3 py-2 text-[11px] font-black disabled:opacity-50">أعد الريل أصدق</button>
          )}
        </div>
      </div>
    );
  };

  const renderBeforeAfterCompare = () => {
    const before = selectedImage || compressedImage || originalImage;
    const after = generatedImage || aiImage;
    if (!before || !after) return null;
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-3 text-right text-slate-900 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <b className="text-xs font-black">مقارنة الأصل والنتيجة</b>
          <span className="text-[10px] font-black text-slate-400">هل تغير الطبق؟</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
            <div className="mb-2 text-[10px] font-black text-slate-500">الأصل</div>
            <div className="aspect-square overflow-hidden rounded-xl bg-white">
              <img src={before} alt="الصورة الأصلية" className="h-full w-full object-contain" />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-2">
            <div className="mb-2 text-[10px] font-black text-emerald-700">النتيجة</div>
            <div className="aspect-square overflow-hidden rounded-xl bg-white">
              <img src={after} alt="الصورة الناتجة" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>
    );
  };


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
    setReelAudit(null);
    setStudioDirector(null);
    setShowImageSettings(false);
    setShowBrandingPanel(false);
    setShowInstagramPreview(false);
  };

  const startFreshImageUpload = () => {
    resetGeneratedOutput();
    setImageDirectSource('image');
    setSelectedImage(null);
    setOriginalImage(null);
    setCompressedImage(null);
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

  const changeStudioPath = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setReelStep(1);
    setProductStep(1);
    setMaxProductStepReached(1);
    setMaxCreateStepReached(1);
    setStudioTab('home');
    toast.info('رجعناك لاختيار المسار', { description: 'اختر صورة مباشرة أو ريل مباشر بدون الخروج من الاستوديو.' });
  };

  const returnImageToSourceMenu = (message = 'رجعناك لاختيار مصدر الصورة') => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setImageDirectSource('menu');
    setProductStep(1);
    setMaxProductStepReached(1);
    setStudioTab('product');
    toast.info(message, { description: 'اختر من صورة أو من فكرة بضغطة واحدة، بدون الخروج من الاستوديو.' });
  };

  const returnReelToSourceMenu = (message = 'رجعناك لاختيار مصدر الريل') => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setReelDirectSource('menu');
    setReelSource('idea');
    setReelStep(1);
    setStudioTab('reel');
    toast.info(message, { description: 'اختر من صورة أو من فكرة داخل الريل، بدون الرجوع للمنيو الرئيسي.' });
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
    const sourceLabel = item?.source === 'image'
      ? 'من صورة'
      : imageDirectSource === 'menu' && studioTab === 'create'
        ? 'من المنيو'
        : studioTab === 'product'
          ? imageDirectSource === 'menu' ? 'من المنيو' : 'من صورة'
          : 'من فكرة';
    return [
      `المسار: ${sourceLabel}`,
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
    { n: 2, t: 'فكرة' },
    { n: 3, t: 'المشهد' },
    { n: 5, t: 'أدوات' },
    { n: 6, t: 'توليد' },
  ];
  const visibleStudioSteps = studioTab === 'product' ? fullStudioSteps : ideaFastSteps;

  const startFastIdeaPath = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setSelectedFormat('9:16');
    setSelectedTheme('نبض الكويت');
    setCreateSubTab('custom');
    setMaxCreateStepReached(2);
    setCreateStep(2);
    setStudioTab('create');
  };

  const startFastReelPath = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setSelectedFormat('9:16');
    setReelSource('idea');
    setReelDirectSource('idea');
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelSubTab('generate');
    setReelStep(4);
    setStudioTab('reel');
  };

  const openReelDirect = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setSelectedFormat('9:16');
    setReelStep(1);
    setReelSource('idea');
    setReelDirectSource('idea');
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelSubTab('generate');
    setStudioTab('reel');
  };

  const openImageDirect = () => {
    closeOpenPanels();
    resetGeneratedOutput();
    resetStudioSourceDraft({ clearImage: true });
    setImageDirectSource('image');
    setProductStep(1);
    setMaxProductStepReached(1);
    setStudioTab('product');
  };

  const openImageIdeaDirect = () => {
    if (!customThemeQuery.trim() && !selectedStudioProductName) {
      toast.error('اكتب فكرة أو اختر منتجًا أولاً');
      return;
    }
    closeOpenPanels();
    resetGeneratedOutput();
    setSelectedImage(null);
    setOriginalImage(null);
    setCompressedImage(null);
    setCompressionStats(null);
    setImageDirectSource('idea');
    setSelectedFormat('1:1');
    setSelectedTheme('نبض الكويت');
    setCreateStep(6);
    setMaxCreateStepReached(6);
    setCreateSubTab('custom');
    setStudioTab('create');
  };

  const openMenuGenerator = (target: 'image' | 'reel') => {
    const currentName = selectedStudioProductName || customThemeQuery.trim();
    if (!currentName) {
      toast.error('اختر منتجًا أولاً');
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
      setImageDirectSource('menu');
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
    setReelDirectSource('menu');
    setGeneratedReel(null);
    setShowReelSettings(false);
    setReelSubTab('generate');
    setReelStep(4);
    setStudioTab('reel');
    toast.success('جهزنا الريل من المنيو — بقي ضغطة التوليد');
  };

  const renderViewfinderFrame = () => (
    <div className="absolute inset-3 sm:inset-5 pointer-events-none opacity-40 z-0">
      <div className="absolute top-0 left-0 w-8 h-8 border-t-[1.5px] border-l-[1.5px] border-white/60" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-[1.5px] border-r-[1.5px] border-white/60" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[1.5px] border-l-[1.5px] border-white/60" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[1.5px] border-r-[1.5px] border-white/60" />
      <div className="absolute inset-0 border border-white/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-50">
         <div className="absolute top-1/2 left-0 w-1.5 h-[1px] bg-white/60" />
         <div className="absolute top-1/2 right-0 w-1.5 h-[1px] bg-white/60" />
         <div className="absolute top-0 left-1/2 w-[1px] h-1.5 bg-white/60" />
         <div className="absolute bottom-0 left-1/2 w-[1px] h-1.5 bg-white/60" />
      </div>
    </div>
  );

  const renderScannerSweep = (message: string, subMessage?: string) => (
    <div className="relative z-10 text-center text-white p-8 w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative w-48 h-[2px] bg-white/10 mb-8 overflow-hidden rounded-full">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatType: "mirror" }} 
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_15px_rgba(167,139,250,0.8)]" 
        />
      </div>
      <div className="w-20 h-20 relative flex items-center justify-center mb-6">
         <div className="absolute inset-0 rounded-full border border-violet-400/30 animate-[ping_2s_ease-out_infinite]" />
         <div className="absolute inset-0 rounded-full border border-indigo-400/20 animate-[ping_3s_ease-in-out_infinite]" />
         <div className="absolute inset-0 rounded-full bg-violet-400/10 blur-xl animate-pulse" />
         <Camera className="text-violet-300 opacity-90" size={30} strokeWidth={2.5} />
      </div>
      <p className="font-black text-xl tracking-wide font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">{message}</p>
      {subMessage && <p className="mt-3 text-xs font-bold text-white/50">{subMessage}</p>}
    </div>
  );

  const renderStageProgress = (currentStep: number, setStep: (step: number) => void) => {
    const steps = visibleStudioSteps;
    const maxAllowedStep = studioTab === 'product' ? maxProductStepReached : maxCreateStepReached;
    const currentIndex = Math.max(0, steps.findIndex((s) => s.n === currentStep));
    const current = steps[currentIndex] || steps[0];
    return (
      <div className="mb-5">
        <div className="md:hidden rounded-[22px] border border-slate-100 bg-slate-50 p-3 flex items-center justify-between gap-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <span className="h-10 px-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shadow-[0_2px_8px_rgba(99,102,241,0.06)]">{currentIndex + 1} من {steps.length}</span>
          <div className="text-right">
            <div className="text-sm font-black text-slate-800">{current.t}</div>
            <div className="text-[10px] font-bold text-slate-500">المرحلة الحالية</div>
          </div>
        </div>
        <div className="hidden md:grid gap-1 rounded-[24px] border border-slate-100 bg-slate-50 p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, idx) => (
            <button key={s.n} type="button" disabled={s.n > maxAllowedStep} onClick={() => { closeOpenPanels(); setStep(s.n); }} className={cn("rounded-[16px] px-2 py-2 text-center transition-all", currentStep === s.n ? "bg-white text-indigo-700 border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ring-1 ring-inset ring-slate-900/5 transform scale-100" : s.n > maxAllowedStep ? "text-slate-300 border border-transparent cursor-not-allowed opacity-60" : "text-slate-500 border border-transparent hover:bg-slate-100/60") }>
              <div className="text-[10px] font-black">{idx + 1}</div>
              <div className="text-[10px] font-black mt-1 whitespace-nowrap">{s.t}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="smart-studio-shell max-w-6xl mx-auto px-2 sm:px-4 py-5 sm:py-8 animate-in fade-in duration-700 pb-32 min-h-[calc(100vh-100px)] rounded-[2.5rem] transition-colors bg-slate-50/50">
      
      <div className="smart-studio-hero mb-4 sm:mb-8 rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 md:p-7 shadow-[0_2px_24px_rgba(15,23,42,0.08)] bg-white ring-1 ring-inset ring-slate-900/5 relative overflow-hidden transition-all duration-700">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-slate-100 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-slate-50 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
          <div className="text-right">
            <h1 className="smart-studio-title text-2xl sm:text-3xl md:text-4xl font-black flex items-center gap-3 leading-tight font-display tracking-tight text-slate-800">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-50 border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"><Camera className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" strokeWidth={2.5} /></span>
              استوديو التراث الذكي
            </h1>
          </div>
          <button onClick={() => setStudioTab('library')} className="h-11 w-11 sm:h-12 sm:w-12 rounded-[14px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 transition-all shadow-[0_2px_12px_rgba(15,23,42,0.03)] active:scale-95" title="الأرشيف">
            <Library size={18} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="relative z-10 mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {studioTab !== 'home' ? (
            <button onClick={changeStudioPath} className="h-10 w-10 sm:h-11 sm:w-11 rounded-[12px] text-xs sm:text-sm font-black bg-white hover:bg-slate-50 text-slate-600 transition-colors border border-slate-200 flex items-center justify-center shadow-sm active:scale-95" title="العودة للمنيو الرئيسي" aria-label="العودة للمنيو الرئيسي">
              <ChevronLeft size={20} strokeWidth={3} className="rotate-180" />
            </button>
          ) : <div />}
        </div>
      </div>

      {studioTab === 'home' && (
        <div className="smart-studio-home-panel max-w-6xl mx-auto rounded-[2.3rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-7 text-right">
          <div className="mb-4 sm:mb-5" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <button onClick={openReelDirect} className="group rounded-[20px] text-right transition-all active:scale-[0.98] overflow-hidden outline-none bg-white border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.03)] ring-1 ring-inset ring-slate-900/5 hover:border-slate-300 active:scale-95 flex flex-col justify-between min-h-[260px] p-6 sm:p-7 relative">
              <div className="relative flex items-center justify-between gap-3">
                <span className="h-14 w-14 rounded-[14px] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform duration-500 ease-out group-active:scale-[0.98]"><Film size={26} strokeWidth={2.5} /></span>
                <span className="rounded-[10px] bg-slate-50 text-slate-800 px-3 py-1.5 text-[11px] font-black border border-slate-200 flex items-center gap-1.5"><Sparkles size={12} className="text-violet-500" /> فيديو / ريل</span>
              </div>
              <div className="relative mt-auto pt-8">
                <div className="text-2xl font-black text-slate-900 leading-tight font-display tracking-tight">ريل مباشر</div>
                <div className="text-sm font-bold text-slate-500 mt-2 leading-relaxed">غرفة مونتاج واحدة: من صورة أو من فكرة. بعدها لقطة، مدة، وتوليد فوري.</div>
                <div className="mt-6 grid grid-cols-2 gap-2 text-center text-[11px] font-black">
                  <span className="rounded-[12px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-600 shadow-sm transition-colors group-hover:bg-slate-100">فكرة مستوحاة</span>
                  <span className="rounded-[12px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-600 shadow-sm transition-colors group-hover:bg-slate-100">صورة مصغرة</span>
                </div>
              </div>
            </button>

            <button onClick={openImageDirect} className="group rounded-[20px] text-right transition-all  overflow-hidden outline-none bg-white border border-slate-200 shadow-[0_2px_12px_rgba(15,23,42,0.03)] ring-1 ring-inset ring-slate-900/5 hover:border-slate-300 active:scale-95 flex flex-col justify-between min-h-[260px] p-6 sm:p-7 relative">
              <div className="relative flex items-center justify-between gap-3">
                <span className="h-14 w-14 rounded-[14px] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform duration-500 ease-out group-hover:scale-105"><Camera size={26} strokeWidth={2.5} /></span>
                <span className="rounded-[10px] bg-slate-50 text-slate-800 px-3 py-1.5 text-[11px] font-black border border-slate-200 flex items-center gap-1.5"><Sparkles size={12} className="text-indigo-500" /> صورة / تصميم</span>
              </div>
              <div className="relative mt-auto pt-8">
                <div className="text-2xl font-black text-slate-900 leading-tight font-display tracking-tight">صورة مباشرة</div>
                <div className="text-sm font-bold text-slate-500 mt-2 leading-relaxed">استوديو صورة متكامل: ارفع صورة أو اكتب فكرة، والاختيار الذكي يوجهك بقوة.</div>
                <div className="mt-6 grid grid-cols-2 gap-2 text-center text-[11px] font-black">
                  <span className="rounded-[12px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-600 shadow-sm transition-colors group-hover:bg-slate-100">صورة حية</span>
                  <span className="rounded-[12px] bg-slate-50 border border-slate-200 px-2 py-2.5 text-slate-600 shadow-sm transition-colors group-hover:bg-slate-100">فكرة إبداعية</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {studioTab === 'library' && (
        <div className="smart-studio-archive-panel max-w-6xl mx-auto rounded-[2.3rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-7 text-right">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 font-display"><Library size={22} className="text-indigo-500 shrink-0" strokeWidth={2.5}/> الأرشيف الإبداعي</h2>
              <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">سجل مرئي لجميع المنتجات والأفكار المولدة.</p>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-[1.3rem] bg-white border border-slate-200 p-1 w-full sm:w-auto sm:min-w-[200px] shadow-sm">
              <button type="button" onClick={() => setArchiveTab('idea')} className={cn("rounded-xl px-4 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'idea' ? "bg-slate-50 text-slate-800 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transform scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent")}>أفكار</button>
              <button type="button" onClick={() => setArchiveTab('image')} className={cn("rounded-xl px-4 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'image' ? "bg-slate-50 text-slate-800 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transform scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent")}>صور</button>
              <button type="button" onClick={() => setArchiveTab('reel')} className={cn("rounded-xl px-4 py-2 text-xs font-black transition-all whitespace-nowrap", archiveTab === 'reel' ? "bg-slate-50 text-slate-800 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transform scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent")}>ريلز</button>
            </div>
          </div>
          {(() => {
            if (archiveTab === 'reel') {
              return reelHistory.length > 0 ? (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                  {reelHistory.map((item, idx) => (
                    <button key={idx} onClick={() => { setGeneratedReel(item.url); setReelDuration(item.duration); setReelShot(item.shot); setReelSource(item.source); setReelDirectSource(item.source); if (item.idea) setCustomThemeQuery(item.idea); if (item.place) setSelectedOrderPlace(item.place); if (item.mood) setSelectedMood(item.mood); setShowReelSettings(true); setStudioTab('reel'); }} className="group break-inside-avoid rounded-[20px] overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:-translate-y-[2px] opacity-90 hover:opacity-100 transition-all duration-300 block w-full text-right outline-none relative ring-1 ring-inset ring-slate-900/5">
                      {item.url?.startsWith('data:image') ? <img src={item.url} className="w-full object-cover bg-slate-50" alt="ريل موشن" /> : <video src={item.url} className="w-full object-cover bg-slate-50" muted playsInline />}
                      <div className="p-4 text-[11px] font-bold text-slate-600 line-clamp-2 md:leading-relaxed">ريل {item.duration} ثواني · {reelShots.find(s => s.id === item.shot)?.label || 'لقطة واقعية'}</div>
                    </button>
                  ))}
                </div>
              ) : <div className="rounded-[2rem] bg-white/50 border border-dashed border-slate-300 p-16 text-center text-slate-500 mb-4 font-bold">الريلز المحفوظة تظهر هنا متى ما أضفتها لرحلتك.</div>;
            }
            const allItems = history.filter(item => item.url);
            const items = allItems.filter((item) => archiveTab === 'idea' ? item.source !== 'image' : item.source === 'image');
            return items.length > 0 ? (
              <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                {items.map((item, idx) => (
                  <button key={idx} onClick={() => { setGeneratedImage(item.url); setAiImage(item.url); setAiCaption(item.caption); if (item.format) setSelectedFormat(item.format); if (item.mode) setRealityMode(item.mode); if (item.background) setBackgroundPreset(item.background); if (item.packId) setSelectedPulseId(item.packId); if (item.place) setSelectedOrderPlace(item.place); if (item.mood) setSelectedMood(item.mood); if (item.customIdea) { setCustomThemeQuery(item.customIdea); setSelectedTheme('مخصص'); } setShowImageSettings(true); setStudioTab(archiveTab === 'image' ? 'product' : 'create'); }} className="group break-inside-avoid rounded-3xl overflow-hidden border border-slate-200/50 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 opacity-90 saturate-[0.85] hover:opacity-100 hover:saturate-100 transition-all duration-500 block w-full text-right outline-none">
                    <img src={item.url} className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" />
                    <div className="p-4 bg-white/80 backdrop-blur-sm text-[11px] font-bold text-slate-600 line-clamp-2 md:leading-relaxed">{archiveTab === 'image' ? 'صورة منتج' : 'صورة من فكرة'}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white/50 border border-dashed border-slate-300 p-16 text-center text-slate-500 mb-4 font-bold">
                {archiveTab === 'idea' ? 'أفكارك وتخيلاتك البصرية تحفظ هنا كلوحة إلهام.' : 'صور المنتجات المتقنة تظهر هنا لسهولة الوصول.'}
              </div>
            );
          })()}
        </div>
      )}


      {studioTab === 'reel' && (
        <div className="studio-workbench-grid grid xl:grid-cols-[420px_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
          <div className="studio-control-card rounded-[2rem] border border-slate-100 bg-white shadow-sm p-4 sm:p-5 text-right">
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-black text-violet-500">ريل قصير</p>
                <button type="button" onClick={() => returnReelToSourceMenu()} className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700 hover:bg-violet-100 transition">اختر مصدر</button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">ريل مباشر — غرفة مونتاج مصغّرة</h2>
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">ابدأ من فكرة أو صورة، ثم اختر اللقطة والمدة داخل مسار واضح.</p>
            </div>

            <div className="mb-5 rounded-[1.6rem] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-3 text-right shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-violet-700">ريل مباشر</div>
                  <div className="text-[11px] font-bold text-violet-900/70 mt-1">المسار مرتب كعملية فيديو: مصدر → لقطة → مدة → توليد.</div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-black text-violet-500"><span className="rounded-xl bg-white border border-violet-100 px-2 py-1">مصدر</span><span className="rounded-xl bg-white border border-violet-100 px-2 py-1">لقطة</span><span className="rounded-xl bg-white border border-violet-100 px-2 py-1">مدة</span></div>
              </div>
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
                          className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-100 text-white font-black text-xs transition-all shadow flex items-center justify-center gap-1.5"
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
                  <button
                    type="button"
                    onClick={() => {
                      resetStudioSourceDraft({ clearImage: true });
                      setReelDirectSource('image');
                      setReelSource('image');
                    }}
                    className={cn("rounded-2xl border p-3 text-right transition-all", reelDirectSource === 'image' ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-slate-50 text-slate-600 border-slate-100")}
                  >
                    <Camera size={18} className="mb-2" />
                    <span className="block text-sm font-black">من صورة</span>
                    <span className="block text-[10px] font-bold mt-1 opacity-70">طبق جاهز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetStudioSourceDraft({ clearImage: true });
                      setReelDirectSource('idea');
                      setReelSource('idea');
                    }}
                    className={cn("rounded-2xl border p-3 text-right transition-all", reelDirectSource === 'idea' ? "bg-slate-950 text-white border-slate-950 shadow-md" : "bg-slate-50 text-slate-600 border-slate-100")}
                  >
                    <Sparkles size={18} className="mb-2" />
                    <span className="block text-sm font-black">من فكرة</span>
                    <span className="block text-[10px] font-bold mt-1 opacity-70">وصف سريع</span>
                  </button>
                </div>
                {reelDirectSource === 'idea' && studioProductPickMode !== 'manual' && (
                  <input type="text" placeholder="مثال: لقطة مجبوس حار يفتح الشهية لريلز إنستغرام..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-violet-500 transition-all duration-300 animate-in fade-in" />
                )}
                {(selectedImage || customThemeQuery.trim()) && (
                  <button type="button" onClick={() => returnReelToSourceMenu()} className="w-full rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-black text-violet-700 hover:bg-violet-100 transition">
                    تصفير المصدر واختيار من جديد
                  </button>
                )}
                {reelDirectSource !== 'image' && renderAlturathBrainCard('reel')}
                {reelDirectSource === 'image' && (
                  <div onClick={() => reelImageInputRef.current?.click()} className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 cursor-pointer text-center">
                    <input type="file" ref={reelImageInputRef} className="hidden" accept="image/*" onChange={handleReelImageUpload} />
                    {selectedImage ? <img src={selectedImage} alt="صورة الريل المختارة" className="mx-auto mb-3 h-40 w-full rounded-2xl object-cover border border-violet-100 bg-white" /> : <Camera className="mx-auto mb-2 text-violet-600" size={26} />}
                    <p className="text-sm font-black text-slate-800">{selectedImage ? 'الصورة ظاهرة وجاهزة للريل' : 'ارفع صورة طبق للريل'}</p>{selectedImage && <p className="mt-1 text-[10px] font-bold text-violet-500">اضغط هنا لتغيير الصورة</p>}
                  </div>
                )}
                <button type="button" onClick={() => setReelStep(2)} className="w-full p-4 rounded-2xl bg-slate-950 text-white font-black shadow-sm border border-slate-200">التالي</button>
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
                <details className="group rounded-3xl bg-slate-950 text-white overflow-hidden">
                  <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-3 select-none">
                    <div><div className="text-[11px] font-black text-white/45 mb-1">آخر مرحلة</div><div className="text-lg font-black">جاهز للتوليد</div></div>
                    <span className="rounded-2xl bg-white/10 px-3 py-1 text-[10px] font-black group-open:hidden">تفاصيل</span>
                    <span className="rounded-2xl bg-white/10 px-3 py-1 text-[10px] font-black hidden group-open:inline-flex">إخفاء</span>
                  </summary>
                  <div className="px-5 pb-5"><div className="text-lg font-black">{customThemeQuery.trim() || selectedStudioProductName || `${reelShots.find(s => s.id === reelShot)?.icon} ${reelShots.find(s => s.id === reelShot)?.label}`}</div><div className="mt-2 text-sm font-bold text-white/60">{reelShots.find(s => s.id === reelShot)?.label} · 9:16 · {reelDuration} ثواني · {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>{!hasValidReelSource() && <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[11px] font-black text-amber-100">ناقص فقط: اختر صورة أو اكتب فكرة. زر التوليد سيرجعك مباشرة للبداية بدون ضياع.</div>}{reelSource === 'image' && selectedImage && <img src={selectedImage} alt="مصدر الريل" className="mt-4 h-28 w-full rounded-2xl object-cover border border-white/10" />}</div>
                </details>
                <div className="grid grid-cols-2 gap-2"><button type="button" onClick={goBackFromReelFinalStep} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button><button type="button" onClick={generateReel} disabled={isGeneratingReel} className="p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{isGeneratingReel ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />} أطلق الإبداع</button></div>
              </div>
            )}
            </>)}
          </div>

          <div className="studio-preview-card rounded-[24px] bg-slate-50 p-3 sm:p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-slate-200 min-h-[460px] sm:min-h-[640px] flex items-center justify-center relative overflow-hidden studio-preview-stage">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl opacity-60" />
            {renderViewfinderFrame()}
            {renderProductionDesk('reel')}
            {!generatedReel && !isGeneratingReel && <div className="relative z-10 text-center text-slate-800 p-8"><div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[20px] bg-white border border-slate-200 shadow-sm transition-transform"><Film className="w-10 h-10 text-slate-300" strokeWidth={1.5}/></div><h3 className="text-3xl font-black mb-3 font-display">معاينة الريل من الكاميرا</h3><p className="text-sm font-bold text-slate-500 leading-7 font-mono uppercase tracking-widest">{activeStudioScene.label} · إطار 9:16 · ريل عمودي · {reelDuration} ثواني</p></div>}
            {isGeneratingReel && renderScannerSweep('نحضّر اللقطة...', 'نختار زاوية التصوير ونضبط الإضاءة قبل الحركة')}
            {generatedReel && !isGeneratingReel && <div className="relative z-10 w-full max-w-[380px] space-y-4"><button type="button" onClick={() => setShowReelSettings((v) => !v)} className="w-full aspect-[9/16] rounded-[20px] overflow-hidden bg-white border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] relative group">{generatedReel.startsWith('data:image') ? <img src={generatedReel} className="w-full h-full object-contain bg-slate-50" alt="ريل موشن" /> : <video src={generatedReel} className="w-full h-full object-contain bg-slate-50" controls playsInline />}</button>{renderQualityAuditCard('reel')}{renderLiveStudioCard('reel')}{renderCampaignRecipe('reel')}{showReelSettings && <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm p-4 text-right text-slate-800"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3"><div><p className="text-xs font-black text-slate-800">إعدادات هذا الريل</p><p className="text-[11px] font-bold text-slate-500 mt-1">انسخها وكرر نفس الحركة لاحقاً.</p></div><button type="button" onClick={() => copyReelSettings()} className="rounded-[12px] bg-slate-100 text-slate-800 px-3 py-2 text-xs font-black flex items-center gap-1 hover:bg-slate-200"><Copy size={14} /> نسخ</button></div><pre className="whitespace-pre-wrap rounded-[12px] bg-slate-50 border border-slate-100 p-3 text-[11px] leading-6 font-bold text-slate-600 text-right font-sans max-h-48 overflow-y-auto break-words shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">{buildReelSettingsText()}</pre></div>}<div className="flex items-center justify-center gap-2"><button onClick={downloadReel} title="تحميل" aria-label="تحميل" className="h-12 w-12 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-sm"><Download size={18} /></button><button type="button" onClick={() => copyReelSettings()} title="نسخ الإعدادات" aria-label="نسخ الإعدادات" className="h-12 w-12 rounded-[14px] bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50"><Copy size={18} /></button><button type="button" onClick={() => { setGeneratedReel(null); setReelStep(4); }} title="إعادة بنفس الأسلوب" aria-label="إعادة بنفس الأسلوب" className="h-12 w-12 rounded-[14px] bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50"><RotateCcw size={18} /></button></div></div>}
          </div>
        </div>
      )}

      {(studioTab === 'create' || studioTab === 'quick' || studioTab === 'whatsapp' || studioTab === 'occasions') && (
        <div className="studio-workbench-grid grid xl:grid-cols-[420px_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
          <div className="studio-control-card rounded-[2rem] border border-slate-100 bg-white shadow-sm p-4 sm:p-5 text-right">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black text-indigo-500 mb-1">من فكرة</p>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">صورة من فكرة</h2>
              <p className="text-sm font-bold text-slate-500 mt-2 leading-7">لوحة تصميم هادئة: مقاس، فكرة، مشهد، ثم توليد بدون زحمة.</p>
              </div>
            </div>

            {/* Sub Tab Switching Inside the Left Configuration Column */}
            <div className="flex gap-1 bg-slate-50 border border-slate-100 p-1 rounded-[1.4rem] mb-5 shadow-inner">
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
                <p className="text-xs font-black text-slate-500">رادار ذكي يتغير حسب الشهر، الويكند، المكان، ونوع الأجواء؛ اختره فقط عندما يخدم المنتج</p>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {seasonRadarCards.map((campaign) => {
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
                          if (!customThemeQuery.trim()) setCustomThemeQuery(`${campaign.title}: ${campaign.desc}`);
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
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", campaign.radarScore >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : campaign.radarScore >= 50 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-100")}>ذكاء {campaign.radarScore}%</span>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 mt-2.5">{campaign.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2 leading-relaxed">{campaign.desc}</p>
                        <p className="text-[10px] font-black text-rose-500 mt-1 leading-relaxed">{campaign.radarReason}</p>
                        
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
                  const activeCampaign = seasonRadarCards.find(c => c.id === selectedSceneId) || seasonRadarCards[0];
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
                            setCustomThemeQuery(`${activeCampaign.title}: ${activeCampaign.desc}. ${activeCampaign.visualPromptAddition}`);
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
                          className="p-3 rounded-xl bg-slate-950 hover:bg-slate-50 border border-slate-200 text-slate-800 text-white font-black text-[10px] shadow transition-all flex items-center justify-center gap-1.5"
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
                    <button type="button" className={cn("rounded-2xl border p-3 text-xs font-black transition-all", customThemeQuery.trim() ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100")}>صف المشهد</button>
                    <button type="button" onClick={() => { setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); }} className={cn("rounded-2xl border p-3 text-xs font-black transition-all", !customThemeQuery.trim() ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-100")}>اختيارات جاهزة</button>
                  </div>
                  {studioProductPickMode !== 'manual' && (
                    <input type="text" placeholder="صف المشهد الذي تتخيله..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-5 min-h-[74px] rounded-[1.4rem] border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-indigo-500 shadow-sm" />
                  )}
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
              const activeScene = studioSceneChoices.find(s => s.id === selectedSceneId) || mergedScenes[0];

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
                                onClick={() => applyStudioSceneChoice(scene, 'create')}
                                className={cn(
                                  "relative p-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer outline-none select-none",
                                  isSelected 
                                    ? "bg-rose-50 border-rose-400 shadow-sm ring-4 ring-rose-500/10 font-bold" 
                                    : "bg-white border-slate-100/50 hover:border-rose-200 hover:bg-slate-50"
                                )}
                              >
                                {renderSceneBadge(scene)}
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
                    <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المشهد: {(studioSceneChoices.find(s => s.id === selectedSceneId) || mergedScenes[0]).label}</div>
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

          <div className="studio-preview-card rounded-[2.2rem] bg-slate-950 p-3 sm:p-5 shadow-2xl border border-slate-900 min-h-[440px] sm:min-h-[590px] flex items-center justify-center relative overflow-hidden studio-preview-stage">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl opacity-60" />
            
            {renderViewfinderFrame()}
            {renderProductionDesk('image')}
            
            {!generatedImage && !isGenerating && (
              <div className="relative z-10 text-center text-white p-8">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2.2rem] bg-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-transform"><Camera className="w-10 h-10 text-white/40" strokeWidth={1.5}/></div>
                <h3 className="text-3xl font-black mb-3 font-display">معاينة الصورة من الكاميرا</h3>
                <p className="text-sm font-bold text-white/55 leading-7 font-mono uppercase tracking-widest">{activeStudioScene.label} · {KUWAIT_PLACES[selectedOrderPlace]?.label}</p>
              </div>
            )}
            {isGenerating && renderScannerSweep('نلتقط الصورة الاستوديو...', 'نضبط الإضاءة والمشهد والواقعية')}
            {generatedImage && !isGenerating && (
              <div className="relative z-10 w-full max-w-full space-y-4">
                <button type="button" onClick={() => setShowImageSettings((v) => !v)} className={cn("w-full rounded-[1.6rem] overflow-hidden bg-white/5 border border-white/10 relative group", previewAspectClass)}>
                  {generatedImage ? (
                    <img src={generatedImage} alt="الصورة الناتجة" className="w-full h-full object-contain" />
                  ) : null}
                  <span className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                </button>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-3 text-white">
                  <div className="mb-3 flex items-center justify-between"><b className="text-xs font-black">معاينة المقاسات قبل النشر</b><span className="text-[10px] font-black text-white/45">موبايل / تابلت / ديسكتوب</span></div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    {[['موبايل','w-16 aspect-[9/16]'], ['تابلت','w-24 aspect-[4/3]'], ['ديسكتوب','w-full aspect-video']].map(([label, cls]) => (
                      <div key={label} className="rounded-2xl bg-slate-950/35 border border-white/10 p-2 text-center">
                        <div className={cn('mx-auto overflow-hidden rounded-xl bg-white/5 border border-white/10', cls)}><img src={generatedImage} alt={label} className="h-full w-full object-contain" /></div>
                        <div className="mt-2 text-[10px] font-black text-white/60">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {renderQualityAuditCard('image')}
                {showImageSettings && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-right text-white shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-black text-white/75">إعدادات هذه الصورة</p>
                        <p className="text-[11px] font-bold text-white/45 mt-1">انسخها لتكرار نفس النتيجة لاحقاً.</p>
                      </div>
                      <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2"><button type="button" onClick={startFreshImageUpload} className="w-full sm:w-auto rounded-2xl bg-white/10 border border-white/15 text-white px-4 py-2 text-xs font-black">رفع صورة جديدة</button><button type="button" onClick={copyCurrentSettings} className="w-full sm:w-auto rounded-2xl bg-white text-slate-950 px-4 py-2 text-xs font-black">نسخ الإعدادات</button></div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-2xl bg-slate-800/20 border border-white/10 p-3 text-[11px] leading-6 font-bold text-white/80 text-right font-sans max-h-48 overflow-y-auto break-words">{buildSettingsText()}</pre>
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
        <div className="studio-workbench-grid grid xl:grid-cols-[420px_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
          <input type="file" ref={productImageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <div className="studio-control-card rounded-[2rem] border border-slate-100 bg-white shadow-sm p-4 sm:p-5 text-right">
            {!originalImage ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-indigo-500 mb-1">صورة مباشرة</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">اختر مصدر الصورة</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 leading-7">اختر المسار: صورة منتج جاهزة، أو فكرة مكتوبة تتحول مباشرة إلى لقطة تسويقية.</p>
                  </div>
                  <button type="button" onClick={changeStudioPath} className="shrink-0 h-10 w-10 rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center" title="العودة للمنيو الرئيسي" aria-label="العودة للمنيو الرئيسي"><ChevronLeft size={17} className="rotate-180" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetStudioSourceDraft({ clearImage: true });
                      setImageDirectSource('image');
                    }}
                    className={cn("rounded-[1.35rem] border p-4 text-right transition-all shadow-sm min-h-[112px] flex flex-col justify-between", imageDirectSource === 'image' ? "bg-slate-950 text-white border-slate-950 shadow-lg" : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300")}
                  >
                    <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl", imageDirectSource === 'image' ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700")}>
                      <Camera size={18} />
                    </div>
                    <span className="block text-sm font-black">من صورة</span>
                    <span className={cn("block text-[11px] font-bold mt-1 leading-5", imageDirectSource === 'image' ? "text-white/75" : "text-slate-500")}>منتج جاهز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetStudioSourceDraft({ clearImage: true });
                      setImageDirectSource('idea');
                    }}
                    className={cn("rounded-[1.35rem] border p-4 text-right transition-all shadow-sm min-h-[112px] flex flex-col justify-between", imageDirectSource === 'idea' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300")}
                  >
                    <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl", imageDirectSource === 'idea' ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700")}>
                      <Sparkles size={18} />
                    </div>
                    <span className="block text-sm font-black">من فكرة</span>
                    <span className={cn("block text-[11px] font-bold mt-1 leading-5", imageDirectSource === 'idea' ? "text-white/75" : "text-slate-500")}>فكرة مباشرة</span>
                  </button>
                </div>
                {imageDirectSource === 'image' && (
                  <div onClick={() => productImageInputRef.current?.click()} className="w-full h-72 sm:h-96 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-indigo-50 via-white to-white rounded-[2.2rem] flex flex-col items-center justify-center cursor-pointer transition-all group shadow-inner">
                    <div className="w-24 h-24 rounded-[2rem] bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 shadow-sm transition-transform"><Camera className="w-10 h-10 text-indigo-600" /></div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">ارفع صورة المنتج</h3>
                    <p className="text-slate-500 text-sm font-bold">JPG / PNG</p>
                  </div>
                )}
                {imageDirectSource === 'idea' && (
                  <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 space-y-3">
                    <div>
                      <div className="text-xs font-black text-indigo-700">صورة من فكرة</div>
                      <div className="text-[11px] font-bold text-indigo-900/60 mt-1">اكتب الفكرة وسنحوّلها إلى صورة مباشرة، من غير طلب صورة منتج.</div>
                    </div>
                    {studioProductPickMode !== 'manual' && (
                      <input type="text" placeholder="مثال: صورة مجبوس دجاج للبيت بإضاءة دافئة..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-indigo-100 bg-white text-sm text-right focus:outline-none focus:border-indigo-500" />
                    )}
                    {renderAlturathBrainCard('image')}
                    <button type="button" onClick={openImageIdeaDirect} className="w-full p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg flex items-center justify-center gap-2">
                      <Sparkles size={18} /> اصنع صورة تسويقية
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className="text-xs font-black text-indigo-500 mb-1">من صورة</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">إخراج الصورة التسويقية</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 leading-7">خطوات قليلة وواضحة: مقاس، فكرة، مشهد، ثم إطلاق الصورة.</p>
                  </div>
                  <button type="button" onClick={() => returnImageToSourceMenu()} className="shrink-0 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] font-black text-indigo-700 hover:bg-indigo-100 transition">اختر مصدر</button>
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
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => returnImageToSourceMenu()} className="p-4 rounded-2xl bg-white border border-indigo-100 text-indigo-700 font-black hover:bg-indigo-50 transition-colors">اختيار مصدر آخر</button>
                      <button type="button" onClick={() => advanceProductStep(2)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">التالي</button>
                    </div>
                  </div>
                )}

                {productStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Edit3 size={14} /> فكرتك</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" className={cn("rounded-2xl border p-3 text-xs font-black transition-all", customThemeQuery.trim() ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100")}>صف المشهد</button>
                        <button type="button" onClick={() => { setCustomThemeQuery(''); setSelectedTheme('نبض الكويت'); }} className={cn("rounded-2xl border p-3 text-xs font-black transition-all", !customThemeQuery.trim() ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-100")}>اختيارات جاهزة</button>
                      </div>
                      {studioProductPickMode !== 'manual' && (
                        <input type="text" placeholder="صف المشهد أو الجو المطلوب للصورة..." value={customThemeQuery} onChange={(e) => handleStudioIdeaChange(e.target.value)} className="w-full p-4 rounded-2xl border-2 text-sm text-right focus:outline-none border-slate-200 bg-white focus:border-indigo-500" />
                      )}
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
                  const activeScene = studioSceneChoices.find(s => s.id === selectedSceneId) || mergedScenes[0];

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
                                    onClick={() => applyStudioSceneChoice(scene, 'product')}
                                    className={cn(
                                      "relative p-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer outline-none select-none",
                                      isSelected 
                                        ? "bg-rose-50 border-rose-400 shadow-sm ring-4 ring-rose-500/10 font-bold" 
                                        : "bg-white border-slate-100/50 hover:border-rose-200 hover:bg-slate-50"
                                    )}
                                  >
                                    {renderSceneBadge(scene)}
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
                      <button type="button" onClick={() => advanceProductStep(6)} className="p-4 rounded-2xl bg-slate-950 text-white font-black shadow-lg">آخر لمسة</button>
                    </div>
                  </div>
                )}

                {productStep === 6 && (
                  <div className="space-y-4">
                    <details className="group rounded-3xl bg-slate-950 text-white overflow-hidden">
                      <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-3 select-none">
                        <div>
                          <div className="text-[11px] font-black text-white/45 mb-1">آخر مرحلة</div>
                          <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">جاهز لتوليد الصورة</div>
                        </div>
                        <span className="rounded-2xl bg-white/10 px-3 py-1 text-[10px] font-black group-open:hidden">تفاصيل</span>
                        <span className="rounded-2xl bg-white/10 px-3 py-1 text-[10px] font-black hidden group-open:inline-flex">إخفاء</span>
                      </summary>
                      <div className="px-5 pb-5">
                      <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">{customThemeQuery.trim() || activeStudioScene.label}</div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-black text-white/85">
                        {(() => { const imageBrain = analyzeAlturathStudioIdea(customThemeQuery, studioProducts); const badge = calculateStudioMatch(imageBrain, true); const sale = calculateSalesReadiness(imageBrain, badge?.value); const profile = getAlturathDishProfile(customThemeQuery || sceneSuggestion?.productType || activeStudioScene.label, studioProducts); return <div className="rounded-2xl bg-emerald-400/15 border border-emerald-300/20 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">جاهزية: {sale}% · {profile.clutterRisk.label}</div>; })()}
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المشهد: {(studioSceneChoices.find(s => s.id === selectedSceneId) || mergedScenes[0]).label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">اللقطة: {(reelShots.find(s => s.id === reelShot) || reelShots[0]).label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المكان: {KUWAIT_PLACES[selectedOrderPlace]?.label}</div>
                        <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 leading-6 whitespace-normal [word-break:keep-all]">المنتج: {selectedStudioProductName || 'تلقائي'}</div>
                      </div>
                      </div>
                    </details>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => goProductStep(5)} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black">رجوع</button>
                      <button onClick={() => generateContent()} disabled={isGenerating || isGeneratingVariants} className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200/50 transition-all disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        أطلق الإبداع
                      </button>
                    </div>
                    <button type="button" onClick={generateFourRealityOptions} disabled={isGenerating || isGeneratingVariants || !selectedImage} className="w-full p-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                      {isGeneratingVariants ? <Loader2 className="animate-spin" size={20} /> : <Layout size={20} />}
                      4 نسخ واقعية
                    </button>
                    <button type="button" onClick={generateBestAutoAttempt} disabled={isGenerating || isGeneratingVariants || !selectedImage} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                      {isGeneratingVariants ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                      أفضل محاولة تلقائياً
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="studio-preview-column w-full space-y-6 sticky top-4 z-40">
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[250px] md:min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden studio-preview-stage studio-preview-stage-light">
              {renderProductionDesk('image')}
              {!generatedImage && !isGenerating && (
                <div className="text-center w-full max-w-lg mx-auto p-4 space-y-5">
                  {imageDirectSource === 'idea' ? (
                    <div className="w-full max-w-[300px] mx-auto aspect-square bg-gradient-to-br from-indigo-50 via-white to-amber-50 rounded-2xl border border-indigo-100 shadow-sm p-5 overflow-hidden flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-sm">
                        <Sparkles size={26} />
                      </div>
                      <div className="text-xs font-black text-indigo-600 mb-2">صورة من فكرة</div>
                      <div className="text-sm font-black text-slate-900 leading-6">
                        {customThemeQuery.trim() || selectedStudioProductName || 'صف المشهد الذي تتخيله'}
                      </div>
                      <div className="mt-3 text-[11px] font-bold text-slate-500 leading-5">هذا المسار يبدأ من النص فقط. اكتب الفكرة ثم أطلق الإبداع.</div>
                    </div>
                  ) : (
                    <>
                      <div className="w-full max-w-[260px] mx-auto aspect-square bg-white rounded-2xl border shadow-sm p-2 overflow-hidden flex items-center justify-center relative group">
                        {compressedImage || selectedImage || originalImage ? (
                          <>
                            <img src={compressedImage || selectedImage || originalImage} alt="صورة المنتج" className="w-full h-full object-cover rounded-xl" />
                            <button type="button" onClick={() => productImageInputRef.current?.click()} className="absolute top-4 right-4 bg-slate-900/80 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-lg" title="تغيير صورة المنتج">
                              <RotateCcw size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">ابدأ برفع صورة المنتج</span>
                        )}
                      </div>
                      {compressedImage || selectedImage || originalImage ? (
                        <button type="button" onClick={() => productImageInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-full transition-colors mt-2">
                          <RotateCcw size={14} /> تغيير صورة المنتج
                        </button>
                      ) : null}
                    </>
                  )}
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
                    <img src={generatedImage} alt="الصورة الناتجة" className="w-full h-full object-contain bg-white" />
                    <span className="absolute bottom-4 right-4 rounded-2xl bg-slate-950/85 px-3 py-2 text-[10px] font-black text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">الإعدادات</span>
                  </button>
	                  <div className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-3 text-slate-900 shadow-sm">
                    <div className="mb-3 flex items-center justify-between"><b className="text-xs font-black">معاينة كل المقاسات قبل النشر</b><span className="text-[10px] font-black text-slate-400">Mobile / Tablet / Desktop</span></div>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      {[['موبايل','w-16 aspect-[9/16]'], ['تابلت','w-24 aspect-[4/3]'], ['ديسكتوب','w-full aspect-video']].map(([label, cls]) => (
                        <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 p-2 text-center">
                          <div className={cn('mx-auto overflow-hidden rounded-xl bg-white border border-slate-100', cls)}><img src={generatedImage} alt={label} className="h-full w-full object-contain" /></div>
                          <div className="mt-2 text-[10px] font-black text-slate-500">{label}</div>
                        </div>
                      ))}
	                    </div>
	                  </div>
	                  {renderBeforeAfterCompare()}
	                  <div className="mx-auto max-w-3xl">{renderQualityAuditCard('image')}</div>
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

                  <div className="w-full max-w-3xl mx-auto">{renderLiveStudioCard('image')}</div>
                  <div className="w-full max-w-3xl mx-auto">{renderCampaignRecipe('image')}</div>

                  <div className="flex flex-wrap gap-2 justify-center px-1">
                    <button onClick={handleDownload} title="تحميل" aria-label="تحميل" className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center"><Download size={18} /></button>
                    <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !generatedImage} title="اجعلها أصدق" aria-label="اجعلها أصدق" className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center disabled:opacity-50"><Sparkles size={18} /></button>
                    <button type="button" onClick={markCurrentStyleAsAvoided} title="لا تكرر الأسلوب" aria-label="لا تكرر الأسلوب" className="h-12 w-12 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center"><X size={18} /></button>
                    <button type="button" onClick={() => { setReelSource('image'); setReelDirectSource('image'); setSelectedImage(generatedImage); setGeneratedReel(null); setShowReelSettings(false); setStudioTab('reel'); setReelStep(1); }} className="h-12 px-5 min-w-[150px] bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs shadow-md transition-all animate-in fade-in"><Film size={16} /> حولها لريل</button>
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
        <div className="max-w-6xl mx-auto space-y-6 text-right animate-in fade-in duration-300">
          <div className="rounded-[2.2rem] border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-black text-emerald-500 block mb-1">من المنيو</span>
                <h2 className="text-2xl font-black text-slate-955">اختر وجبة، ثم افتح الصورة أو الريل</h2>
                <p className="text-sm font-bold text-slate-500 mt-2 leading-7">مسار كتالوج بصري يبدأ من المنيو وينتهي بصورة أو ريل.</p>
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
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs font-black text-slate-700 focus:outline-none focus:border-emerald-400 text-right min-w-[220px]"
                >
                  <option value="">اختر منتجًا</option>
                  {data?.products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{getAlturathProductName(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
              <div className="text-[11px] font-black text-emerald-600 mb-1">الوجبة المختارة</div>
              <div className="text-lg font-black text-slate-950 leading-7">{selectedStudioProductName || customThemeQuery || 'اختر منتجًا'}</div>
              <div className="mt-2 text-[11px] font-bold text-slate-500">بعد اختيار الوجبة حدد نوع المخرج: صورة أو ريل.</div>
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

            <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
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
                          <h3 className="text-sm font-black text-slate-900">خريطة التنفيذ السريع</h3>
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
                  <div className="text-lg font-black leading-8 whitespace-normal [word-break:keep-all]">{selectedStudioProductName || customThemeQuery || 'اختر منتجًا'}</div>
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
                    {menuOutputType === 'image' ? 'ابدأ توليد الصورة' : 'ابدأ توليد الريل'}
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
