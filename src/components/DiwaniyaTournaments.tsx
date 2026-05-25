import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Crown, Medal, Swords, Target, Settings, Flame, Star, ExternalLink, MessageCircle, X, Plus, Trash2, Edit2, Check, Copy, MapPin, Radio, Navigation, BellRing, Compass, Smartphone, Laptop, Sparkles, ChevronDown, ChevronUp, Download, AlertTriangle, Activity, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { DEFAULT_SQUADS } from '../data';
import { normalizeArabicNumerals } from '../lib/utils';

export const DiwaniyaTournaments: React.FC<{ data: any; setData: any, onNavigate?: (page: string) => void }> = ({ data, setData, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'squads' | 'settings' | 'radar'>('leaderboard');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const radarMapRef = React.useRef<HTMLDivElement | null>(null);
  const coordinatesBoxRef = React.useRef<HTMLDivElement | null>(null);
  const selectedSquadCardRef = React.useRef<HTMLDivElement | null>(null);
  const [radarMapSize, setRadarMapSize] = useState({ width: 0, height: 0 });

  const normalizeSquadRecord = (sq: any, fallbackIndex = 0) => {
    const location = sq?.location || sq?.geo || sq?.diwaniyaLocation || sq?.radarLocation || sq?.coordinates || sq?.mapLocation || sq?.clientLocation || {};
    const lat = sq?.lat ?? sq?.latitude ?? location?.lat ?? location?.latitude ?? location?._lat;
    const lng = sq?.lng ?? sq?.longitude ?? sq?.lon ?? location?.lng ?? location?.longitude ?? location?.lon ?? location?._long;
    return {
      ...sq,
      id: sq?.id ?? sq?.diwaniyaId ?? sq?.squadId ?? sq?.docId ?? `${sq?.name || 'diwaniya'}-${fallbackIndex}`,
      name: sq?.name ?? sq?.diwaniyaName ?? sq?.squadName ?? sq?.title ?? 'ديوانية بدون اسم',
      founder: sq?.founder ?? sq?.ownerName ?? sq?.hostName ?? sq?.king ?? sq?.membersList?.[0]?.name ?? '',
      phone: sq?.phone ?? sq?.founderPhone ?? sq?.ownerPhone ?? sq?.hostPhone ?? sq?.membersList?.[0]?.phone ?? '',
      points: Number(sq?.points ?? sq?.diwaniyaPoints ?? 0) || 0,
      members: Number(sq?.members ?? sq?.membersCount ?? sq?.membersList?.length ?? 0) || 0,
      ...(lat !== undefined && lng !== undefined ? { lat, lng, location: { ...location, lat, lng } } : {}),
    };
  };

  const squadIdentity = (sq: any) => String(sq?.id ?? sq?.diwaniyaId ?? sq?.squadId ?? sq?.name ?? sq?.diwaniyaName ?? sq?.phone ?? '').trim().toLowerCase();

  // Merge all client/admin diwaniya collections so hosted diwaniyas do not disappear when leaving the screen or reopening the app.
  const squads = React.useMemo(() => {
    // Reverse the order so data.squads (the source of truth) overwrites the others during merge
    const sources = [data?.clientDiwaniyas, data?.hostedSquads, data?.hostedDiwaniyas, data?.diwaniyaSquads, data?.diwaniyas, data?.squads].filter(Array.isArray) as any[][];
    if (!sources.length) return DEFAULT_SQUADS.map(normalizeSquadRecord);
    const merged = new Map<string, any>();
    sources.flat().filter(Boolean).forEach((sq: any, index: number) => {
      const normalized = normalizeSquadRecord(sq, index);
      const key = squadIdentity(normalized) || String(index);
      merged.set(key, { ...(merged.get(key) || {}), ...normalized });
    });
    return Array.from(merged.values());
  }, [data?.squads, data?.diwaniyas, data?.diwaniyaSquads, data?.hostedDiwaniyas, data?.hostedSquads, data?.clientDiwaniyas]);

  const setSquads = (newSquads: any[]) => {
    const normalizedSquads = newSquads.map(normalizeSquadRecord);
    setData((prev: any) => {
      const updated = {
        ...prev,
        squads: normalizedSquads,
        diwaniyas: normalizedSquads,
        diwaniyaSquads: normalizedSquads,
        hostedDiwaniyas: normalizedSquads,
        hostedSquads: normalizedSquads,
      };
      // Keep clientDiwaniyas untouched unless specifically requested, to avoid blasting client state unnecessarily, but normally they use the same DB.
      localStorage.setItem('ktk_accounting_data', JSON.stringify(updated));
      return updated;
    });
  };

  React.useEffect(() => {
    if (!Array.isArray(data?.squads) && squads.length) {
      setData((prev: any) => {
        const updated = { ...prev, squads, diwaniyas: Array.isArray(prev?.diwaniyas) ? prev.diwaniyas : squads, diwaniyaSquads: Array.isArray(prev?.diwaniyaSquads) ? prev.diwaniyaSquads : squads };
        localStorage.setItem('ktk_accounting_data', JSON.stringify(updated));
        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Persist through the shared AppState using a functional update
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
  const [editedSquadFounder, setEditedSquadFounder] = useState('');
  const [editedSquadPhone, setEditedSquadPhone] = useState('');
  const [levelsBarExpanded, setLevelsBarExpanded] = useState(false);

  // Manual Squad registration states
  const [showAddSquad, setShowAddSquad] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadFounder, setNewSquadFounder] = useState('');
  const [newSquadPhone, setNewSquadPhone] = useState('');
  const [squadSearchQuery, setSquadSearchQuery] = useState('');

  // Geolocation & Kuwait Map coordinates states
  const [activeMapSquadId, setActiveMapSquadId] = useState<number | string | null>(null);
  const [radarMapMode, setRadarMapMode] = useState<'map' | 'heatmap'>('map');
  const [riskFilter, setRiskFilter] = useState<'all' | 'missing' | 'overlap' | 'stale' | 'pending'>('all');
  const [missingLocationPage, setMissingLocationPage] = useState(1);
  const [riskPage, setRiskPage] = useState(1);
  const RADAR_LIST_PAGE_SIZE = 12;
  const RADAR_MAP_MARKER_LIMIT = 500;
  const RADAR_TILE_SIZE = 256;
  const RADAR_MAP_ZOOM = 9;
  const RADAR_INITIAL_MAP_CENTER = { lat: 29.27, lng: 47.86 };
  const [radarMapCenter, setRadarMapCenter] = useState(RADAR_INITIAL_MAP_CENTER);

  const governorates = [
    { name: 'العاصمة', x: 58, y: 35 },
    { name: 'حولي', x: 60, y: 39 },
    { name: 'الفروانية', x: 55, y: 43 },
    { name: 'مبارك الكبير', x: 60, y: 47 },
    { name: 'الأحمدي', x: 59, y: 69 },
    { name: 'الجهراء', x: 35, y: 34 }
  ];

  const mappedSquadsForMap = React.useMemo(() => {
    return squads.map((sq: any, index: number) => {
      // Deterministic governorate index
      const govIndex = index % governorates.length;
      const gov = governorates[govIndex];
      
      const step = index * 1.7; 
      const radiusX = 3 + (index % 3) * 1.5;
      const radiusY = 3 + (index % 2) * 1.5;
      let posX = Math.min(92, Math.max(8, gov.x + radiusX * Math.cos(step)));
      let posY = Math.min(92, Math.max(8, gov.y + radiusY * Math.sin(step)));
      let govName = gov.name;

      // لا نربط اسم العائلة/الديوانية بمكان جغرافي. الموقع الحقيقي يأتي من lat/lng فقط؛
      // أي ديوانية بلا إحداثيات تبقى على توزيع احتياطي داخل الكويت ولا تُنقل تلقائياً إلى فيلكا.
      
      return {
        ...sq,
        govName,
        x: posX,
        y: posY,
      };
    });
  }, [squads]);

  const selectedSquad = React.useMemo(() => {
    return mappedSquadsForMap.find((s: any) => String(s.id) === String(activeMapSquadId)) || null;
  }, [mappedSquadsForMap, activeMapSquadId]);

  const clampGeofenceDistance = (value: any, fallback = 100) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.max(10, Math.min(100, Math.round(n)));
  };

  const getSquadGeofenceDistance = (sq?: any) => clampGeofenceDistance(
    sq?.geofenceDistance ??
      sq?.squadGeofenceDistance ??
      sq?.diwaniyaGeofenceDistance ??
      sq?.radarDistance ??
      sq?.location?.geofenceDistance ??
      data?.settings?.squadGeofenceDistance ??
      data?.squadGeofenceDistance ??
      data?.geofenceDistance,
    100
  );

  const geofenceDistance = clampGeofenceDistance(data?.settings?.squadGeofenceDistance ?? data?.squadGeofenceDistance ?? data?.geofenceDistance, 100);

  const allOrders = Array.isArray(data?.orders) ? data.orders : Array.isArray(data?.invoices) ? data.invoices : [];

  const getOrderSquadId = (order: any) => order?.squadId ?? order?.diwaniyaId ?? order?.squad?.id ?? order?.diwaniya?.id ?? order?.customer?.squadId ?? order?.customer?.diwaniyaId;

  const isOrderLinkedToSquad = (order: any, squad: any) => {
    const orderSquadId = getOrderSquadId(order);
    if (orderSquadId !== undefined && orderSquadId !== null && String(orderSquadId) === String(squad?.id)) return true;
    const orderSquadName = String(order?.squadName ?? order?.diwaniyaName ?? order?.squad?.name ?? order?.diwaniya?.name ?? '').trim();
    return Boolean(orderSquadName && squad?.name && orderSquadName === String(squad.name).trim());
  };

  const getSquadOrders = (squad: any) => allOrders.filter((order: any) => isOrderLinkedToSquad(order, squad));

  const getRequestCreatedAt = (request: any) => {
    const raw = request?.createdAt ?? request?.requestedAt ?? request?.timestamp ?? request?.date ?? request?.created_at;
    const time = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(time) ? time : null;
  };

  const isStaleJoinRequest = (request: any) => {
    const createdAt = getRequestCreatedAt(request);
    if (!createdAt) return false;
    return Date.now() - createdAt > 24 * 60 * 60 * 1000;
  };

  const downloadTextFile = (fileName: string, content: string, type = 'text/csv;charset=utf-8;') => {
    const blob = new Blob(['\ufeff' + content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const csvCell = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const exportDiwaniyaReport = (squad: any) => {
    if (!squad) {
      toast.error('اختر ديوانية أولاً');
      return;
    }
    const members = Array.isArray(squad?.membersList) ? squad.membersList : [];
    const presence = getSquadPresence(squad);
    const codes = getSquadTemporaryCodes(squad);
    const openOrder = getSquadOpenOrder(squad);
    const pendingRequests = getSquadJoinRequests(squad);
    const squadOrders = getSquadOrders(squad);
    const lines = [
      ['قسم', 'الاسم', 'الهاتف', 'تفاصيل', 'ملاحظة'].map(csvCell).join(','),
      ['ملخص', squad.name, squad.phone || squad.membersList?.[0]?.phone || '', `الأعضاء: ${members.length || squad.members || 0} | الحضور الآن: ${presence.length} | طلبات دخول معلقة: ${pendingRequests.length}`, 'تقرير ديوانية منفصل عن الدفع'].map(csvCell).join(','),
      ...members.map((m: any) => ['عضو', m.name || 'غير معروف', m.phone || '', `النقاط: ${m.points || 0}`, m.role || ''].map(csvCell).join(',')),
      ...presence.map((m: any) => ['حضور الآن', m.name || m.memberName || 'عضو', m.phone || m.memberPhone || '', m.checkedInAt || m.timestamp || '', 'ضغط أنا وصلت'].map(csvCell).join(',')),
      ...codes.map((c: any) => ['كود مؤقت', c.code || c.value || '', c.createdByPhone || '', c.expiresAt ? `ينتهي: ${c.expiresAt}` : 'فعال', c.usedBy ? `استخدمه: ${c.usedBy}` : 'لم يستخدم'].map(csvCell).join(',')),
      ...pendingRequests.map((r: any) => ['طلب انضمام', r.name || r.customerName || 'ضيف', r.phone || r.customerPhone || '', `${Math.round(Number(r.distance || r.distanceMeters || 0)) || '—'} متر`, isStaleJoinRequest(r) ? 'متأخر أكثر من 24 ساعة' : 'معلق'].map(csvCell).join(',')),
      ...(openOrder ? [['طلب جماعي مفتوح', openOrder.title || openOrder.name || 'طلب ديوانية', '', `${Array.isArray(openOrder.items) ? openOrder.items.length : 0} أصناف/مشاركات`, 'تشغيلي فقط بدون دفع'].map(csvCell).join(',')] : []),
      ['طلبات مرتبطة بالديوانية', String(squadOrders.length), '', 'عدد الطلبات المرتبطة فقط بدون تفاصيل دفع', 'لا يتضمن أي حالة دفع أو تقرير مالي'].map(csvCell).join(','),
    ];
    const safeName = String(squad.name || 'diwaniya').replace(/[\\/:*?"<>|\s]+/g, '_');
    downloadTextFile(`diwaniya_report_${safeName}.csv`, lines.join('\n'));
    toast.success('تم تصدير تقرير الديوانية بدون بيانات الدفع');
  };


  const handleDistanceChange = (val: number) => {
    setData((prev: any) => {
      const normalized = clampGeofenceDistance(val);
      const updated = {
        ...prev,
        geofenceDistance: normalized,
        squadGeofenceDistance: normalized,
        settings: { ...(prev?.settings || {}), squadGeofenceDistance: normalized },
      };
      localStorage.setItem('ktk_accounting_data', JSON.stringify(updated));
      return updated;
    });
  };

  const startEditSquad = (squad: any) => {
    setEditingSquadId(squad.id);
    setEditedSquadName(squad.name || '');
    setEditedSquadFounder(squad.founder || squad.king || squad.membersList?.[0]?.name || '');
    setEditedSquadPhone(squad.phone || squad.membersList?.[0]?.phone || '');
  };

  const saveSquadName = (id: any) => {
    const nextName = editedSquadName.trim();
    if (!nextName) {
      toast.error('اكتب اسم الديوانية أولاً');
      return;
    }
    setSquads(squads.map((sq: any) => sq.id === id ? { 
      ...sq, 
      name: nextName,
      founder: editedSquadFounder.trim() || sq.founder,
      phone: editedSquadPhone.trim() || sq.phone
    } : sq));
    setEditingSquadId(null);
    setEditedSquadName('');
    setEditedSquadFounder('');
    setEditedSquadPhone('');
    toast.success('تم تعديل بيانات الديوانية والمؤسس بنجاح');
  };

  const handleAddSquad = () => {
    const name = newSquadName.trim();
    const founder = newSquadFounder.trim();
    const phone = newSquadPhone.trim();
    if (!name) {
      toast.error('اكتب اسم الديوانية');
      return;
    }
    const newId = Date.now();
    const newSquadObj = {
      id: newId,
      name,
      founder: founder || 'غير محدد',
      phone: phone || '',
      points: 0,
      tier: 'شلة ديوانية',
      members: 1,
      king: founder || 'المؤسس',
      kingOrders: 0,
      membersList: founder ? [{ name: founder, phone: phone || '90000000', points: 0 }] : []
    };

    setSquads([...squads, newSquadObj]);
    setNewSquadName('');
    setNewSquadFounder('');
    setNewSquadPhone('');
    setShowAddSquad(false);
    toast.success('تم تسجِيل الديوانية والمؤسس الجديد بنجاح! 🎉');
  };

  const deleteSquad = (squad: any) => {
    if (!squad || squad.id === undefined || squad.id === null) {
      toast.error('ما قدرنا نحدد الديوانية اللي تبي تحذفها');
      return;
    }
    const currentSquads = Array.isArray(data?.squads) ? data.squads : squads;
    const nextSquads = currentSquads.filter((sq: any) => String(sq.id) !== String(squad.id));

    setSquads(nextSquads);

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
        toast.error('ما قدرنا ننسخ الرابط');
      }
    } catch (err) {
      toast.error('ما قدرنا ننسخ الرابط');
    }
    
    document.body.removeChild(textArea);
  };

  const openWhatsApp = (phone: string, squadName: string) => {
    const message = encodeURIComponent(sanitizeWhatsAppText(`\u2728 مرحباً يا ديوانية ${squadName}!\nنشكركم على ولائكم الدائم لمطبخ التراث الكويتي.`));
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`, '_blank');
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
          toast.error(`المعذرة، نقاط المستوى الحالي لازم تكون أكبر من المستوى السابق (${tiers[currentIndex - 1].name}: ${tiers[currentIndex - 1].points})`);
          return;
        }
      }
      if (currentIndex < tiers.length - 1) {
        const nextPoints = parsePoints(tiers[currentIndex + 1].points);
        if (newPoints >= nextPoints) {
          toast.error(`المعذرة، نقاط المستوى الحالي لازم تكون أقل من المستوى التالي (${tiers[currentIndex + 1].name}: ${tiers[currentIndex + 1].points})`);
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



  const toNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'object' && typeof value.toJSON === 'function') return toNumber(value.toJSON());
    const n = Number(String(value).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.'));
    return Number.isFinite(n) ? n : null;
  };

  const getSquadLatLng = (sq: any) => {
    const locationCandidates = [
      sq, sq?.location, sq?.geo, sq?.coordinates, sq?.mapLocation, sq?.clientLocation,
      sq?.diwaniyaLocation, sq?.radarLocation, sq?.pinLocation, sq?.geofenceCenter, sq?.addressLocation,
    ].filter(Boolean);
    for (const loc of locationCandidates) {
      const lat = toNumber(loc?.lat ?? loc?.latitude ?? loc?._lat);
      const lng = toNumber(loc?.lng ?? loc?.longitude ?? loc?.lon ?? loc?._long);
      if (lat !== null && lng !== null && lat >= 28.3 && lat <= 30.3 && lng >= 46.4 && lng <= 49.0) return { lat, lng };
    }
    return null;
  };

  const kuwaitGeoToMapPoint = (lat: number, lng: number) => {
    // Fallback only. Accurate marker placement in the radar map uses Web Mercator
    // pixels so the marker remains correct on every responsive size.
    const minLng = 46.545;
    const maxLng = 48.455;
    const minLat = 28.515;
    const maxLat = 30.105;
    const normalizedX = Math.min(1, Math.max(0, (lng - minLng) / (maxLng - minLng)));
    const normalizedY = Math.min(1, Math.max(0, (lat - minLat) / (maxLat - minLat)));

    return {
      x: Math.min(76, Math.max(27, 27 + normalizedX * 49)),
      y: Math.min(90, Math.max(9, 90 - normalizedY * 81)),
    };
  };

  const getMissingLocationDockPoint = (index: number) => ({
    x: 6.5,
    y: Math.min(90, 16 + (index % 12) * 6),
  });

  const getDistanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  };

  const getSquadKeyCandidates = (sq: any) => new Set([
    sq?.id,
    sq?.diwaniyaId,
    sq?.squadId,
    sq?.docId,
    sq?.name,
    sq?.diwaniyaName,
    sq?.squadName,
    sq?.phone,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '').map((value) => String(value).trim().toLowerCase()));

  const isLinkedToSquad = (item: any, sq: any) => {
    if (!item || !sq) return false;
    const keys = getSquadKeyCandidates(sq);
    const candidates = [
      item?.squadId,
      item?.diwaniyaId,
      item?.squad?.id,
      item?.diwaniya?.id,
      item?.targetSquadId,
      item?.hostedSquadId,
      item?.squadName,
      item?.diwaniyaName,
      item?.squad?.name,
      item?.diwaniya?.name,
      item?.toPhone,
      item?.ownerPhone,
      item?.hostPhone,
    ];
    return candidates.some((value) => value !== undefined && value !== null && keys.has(String(value).trim().toLowerCase()));
  };

  const getSharedArray = (...keys: string[]) => {
    for (const key of keys) {
      const value = data?.[key];
      if (Array.isArray(value)) return value;
    }
    return [];
  };

  const getSquadJoinRequests = (sq: any) => {
    const embedded = sq?.geofenceJoinRequests ?? sq?.joinRequests ?? sq?.pendingJoinRequests ?? sq?.diwaniyaJoinRequests ?? [];
    const shared = getSharedArray('geofenceJoinRequests', 'diwaniyaJoinRequests', 'squadJoinRequests').filter((request: any) => isLinkedToSquad(request, sq));
    const raw = [...(Array.isArray(embedded) ? embedded : []), ...shared];
    return raw.filter((request: any) => !request?.status || request.status === 'pending' || request.status === 'معلق');
  };

  const getSquadPresence = (sq: any) => {
    const embedded = sq?.presenceNow ?? sq?.presentMembers ?? sq?.currentPresence ?? sq?.checkedInMembers ?? [];
    const shared = getSharedArray('squadPresence', 'diwaniyaPresence', 'presenceNow').filter((presence: any) => isLinkedToSquad(presence, sq));
    return [...(Array.isArray(embedded) ? embedded : []), ...shared].filter(Boolean);
  };

  const getSquadOpenOrder = (sq: any) => {
    const embedded = [sq?.openGroupOrder, sq?.groupOrder, sq?.collectiveOrder, ...(Array.isArray(sq?.groupOrders) ? sq.groupOrders : [])].filter(Boolean);
    const shared = getSharedArray('squadGroupOrders', 'diwaniyaGroupOrders', 'groupOrders').filter((order: any) => isLinkedToSquad(order, sq));
    const orders = [...embedded, ...shared];
    return orders.find((order: any) => !order?.status || ['open', 'active', 'مفتوح'].includes(String(order.status))) || null;
  };

  const getSquadTemporaryCodes = (sq: any) => {
    const embedded = sq?.temporaryInviteCodes ?? sq?.tempInviteCodes ?? sq?.guestCodes ?? sq?.inviteCodes ?? sq?.accessCodes ?? [];
    const shared = getSharedArray('squadTempCodes', 'diwaniyaTempCodes', 'temporaryInviteCodes', 'guestCodes').filter((code: any) => isLinkedToSquad(code, sq));
    const raw = [...(Array.isArray(embedded) ? embedded : []), ...shared];
    const now = Date.now();
    return raw.filter((code: any) => {
      const status = String(code?.status ?? '').trim().toLowerCase();
      const expiresAt = code?.expiresAt?.toMillis?.() ?? (code?.expiresAt ? new Date(code.expiresAt).getTime() : null);
      const explicitlyDisabled = code?.expired === true || code?.isActive === false || code?.active === false || code?.enabled === false || ['used', 'inactive', 'disabled', 'expired', 'cancelled', 'canceled', 'غير فعال', 'منتهي', 'مستخدم'].includes(status);
      const expiredByDate = Number.isFinite(expiresAt) && Number(expiresAt) < now;
      return !explicitlyDisabled && !expiredByDate;
    });
  };

  const diwaniyaAdminRadar = React.useMemo(() => {
    const enrichedBase = squads.map((sq: any, index: number) => {
      const actualLocation = getSquadLatLng(sq);
      const missingDock = getMissingLocationDockPoint(index);
      const pendingRequests = getSquadJoinRequests(sq);
      const presence = getSquadPresence(sq);
      const openOrder = getSquadOpenOrder(sq);
      const tempCodes = getSquadTemporaryCodes(sq);
      const linkedOrders = getSquadOrders(sq);
      const staleRequests = pendingRequests.filter(isStaleJoinRequest);
      const requestDistances = pendingRequests.map((r: any) => toNumber(r?.distance ?? r?.distanceMeters ?? r?.meters)).filter((v: any) => v !== null) as number[];
      const avgRequestDistance = requestDistances.length ? Math.round(requestDistances.reduce((sum, value) => sum + value, 0) / requestDistances.length) : null;
      const mapPoint = actualLocation ? kuwaitGeoToMapPoint(actualLocation.lat, actualLocation.lng) : missingDock;
      const heatRawCount = linkedOrders.length + presence.length + pendingRequests.length + tempCodes.length + (openOrder ? 1 : 0);
      const heatWeight = linkedOrders.length * 2 + presence.length * 3 + pendingRequests.length + tempCodes.length + (openOrder ? 4 : 0);
      return {
        ...sq,
        actualLocation,
        mapX: mapPoint.x,
        mapY: mapPoint.y,
        originalMapX: mapPoint.x,
        originalMapY: mapPoint.y,
        govName: actualLocation ? 'الكويت' : 'غير مثبت',
        pendingRequests,
        presence,
        openOrder,
        tempCodes,
        linkedOrders,
        staleRequests,
        avgRequestDistance,
        activityWeight: heatWeight,
        heatValue: heatRawCount,
        heatWeight,
        heatBreakdown: {
          orders: linkedOrders.length,
          presence: presence.length,
          pending: pendingRequests.length,
          codes: tempCodes.length,
          openGroupOrders: openOrder ? 1 : 0,
        },
        membersCount: Number(sq?.members ?? sq?.membersList?.length ?? 0) || 0,
      };
    });

    // نفصل النقاط المتطابقة أو المتقاربة بصرياً فقط حتى لا تظهر فوق بعض،
    // مع الحفاظ على المعايرة الأصلية القريبة لموقع العميل.
    const buckets = new Map<string, any[]>();
    enrichedBase.forEach((sq: any) => {
      if (!sq.actualLocation) return;
      const key = `${Math.round((sq.originalMapX || 0) * 2) / 2}:${Math.round((sq.originalMapY || 0) * 2) / 2}`;
      const list = buckets.get(key) || [];
      list.push(sq);
      buckets.set(key, list);
    });
    buckets.forEach((items) => {
      if (items.length <= 1) return;
      const radius = Math.min(3.8, 1.25 + items.length * 0.28);
      items.forEach((sq: any, idx: number) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2 * idx) / items.length);
        sq.mapX = Math.min(78, Math.max(24, (sq.originalMapX || 50) + Math.cos(angle) * radius));
        sq.mapY = Math.min(91, Math.max(8, (sq.originalMapY || 50) + Math.sin(angle) * radius));
        sq.clusterCount = items.length;
      });
    });

    const enriched = enrichedBase;

    const missingLocation = enriched.filter((sq: any) => !sq.actualLocation);
    const pending = enriched.flatMap((sq: any) => sq.pendingRequests.map((request: any) => ({ ...request, squadId: sq.id, squadName: sq.name })));
    const stalePending = enriched.flatMap((sq: any) => sq.staleRequests.map((request: any) => ({ ...request, squadId: sq.id, squadName: sq.name })));
    const duplicateWarnings: any[] = [];
    for (let i = 0; i < enriched.length; i += 1) {
      for (let j = i + 1; j < enriched.length; j += 1) {
        if (!enriched[i].actualLocation || !enriched[j].actualLocation) continue;
        const distance = getDistanceMeters(enriched[i].actualLocation, enriched[j].actualLocation);
        const firstRange = getSquadGeofenceDistance(enriched[i]);
        const secondRange = getSquadGeofenceDistance(enriched[j]);
        if (distance <= Math.max(25, Math.min(firstRange, secondRange))) {
          duplicateWarnings.push({ first: enriched[i], second: enriched[j], distance });
        }
      }
    }
    const topJoinSquads = [...enriched].sort((a: any, b: any) => b.pendingRequests.length - a.pendingRequests.length).slice(0, 5);
    const openGroupOrders = enriched.filter((sq: any) => sq.openOrder);
    const activePresence = enriched.filter((sq: any) => sq.presence.length > 0).sort((a: any, b: any) => b.presence.length - a.presence.length);
    const activeCodes = enriched.filter((sq: any) => sq.tempCodes.length > 0);
    const heatMax = Math.max(1, ...enriched.map((sq: any) => sq.heatWeight || 0));
    const heatPoints = enriched.map((sq: any) => ({
      ...sq,
      heatLevel: Math.max(0.18, Math.min(1, (sq.heatWeight || 0) / heatMax)),
    }));
    const riskSquads = enriched.filter((sq: any) =>
      !sq.actualLocation || sq.pendingRequests.length > 0 || sq.staleRequests.length > 0 || duplicateWarnings.some((w: any) => String(w.first.id) === String(sq.id) || String(w.second.id) === String(sq.id))
    );

    return { enriched, missingLocation, pending, stalePending, duplicateWarnings, topJoinSquads, openGroupOrders, activePresence, activeCodes, heatPoints, riskSquads };
  }, [squads, mappedSquadsForMap, geofenceDistance, allOrders, data?.geofenceJoinRequests, data?.diwaniyaJoinRequests, data?.squadJoinRequests, data?.squadPresence, data?.diwaniyaPresence, data?.squadGroupOrders, data?.diwaniyaGroupOrders, data?.squadTempCodes, data?.diwaniyaTempCodes]);

  const filteredRiskSquads = React.useMemo(() => {
    if (riskFilter === 'missing') return diwaniyaAdminRadar.enriched.filter((sq: any) => !sq.actualLocation);
    if (riskFilter === 'pending') return diwaniyaAdminRadar.enriched.filter((sq: any) => sq.pendingRequests.length > 0);
    if (riskFilter === 'stale') return diwaniyaAdminRadar.enriched.filter((sq: any) => sq.staleRequests.length > 0);
    if (riskFilter === 'overlap') return diwaniyaAdminRadar.enriched.filter((sq: any) => diwaniyaAdminRadar.duplicateWarnings.some((w: any) => String(w.first.id) === String(sq.id) || String(w.second.id) === String(sq.id)));
    return diwaniyaAdminRadar.riskSquads;
  }, [diwaniyaAdminRadar, riskFilter]);

  const missingLocationTotalPages = Math.max(1, Math.ceil(diwaniyaAdminRadar.missingLocation.length / RADAR_LIST_PAGE_SIZE));
  const visibleMissingLocation = React.useMemo(() => {
    const safePage = Math.min(Math.max(1, missingLocationPage), missingLocationTotalPages);
    const start = (safePage - 1) * RADAR_LIST_PAGE_SIZE;
    return diwaniyaAdminRadar.missingLocation.slice(start, start + RADAR_LIST_PAGE_SIZE);
  }, [diwaniyaAdminRadar.missingLocation, missingLocationPage, missingLocationTotalPages]);

  const riskTotalPages = Math.max(1, Math.ceil(filteredRiskSquads.length / RADAR_LIST_PAGE_SIZE));
  const visibleRiskSquads = React.useMemo(() => {
    const safePage = Math.min(Math.max(1, riskPage), riskTotalPages);
    const start = (safePage - 1) * RADAR_LIST_PAGE_SIZE;
    return filteredRiskSquads.slice(start, start + RADAR_LIST_PAGE_SIZE);
  }, [filteredRiskSquads, riskPage, riskTotalPages]);

  const visibleMapSquads = React.useMemo(() => {
    const withLocation = diwaniyaAdminRadar.enriched.filter((sq: any) => sq.actualLocation);
    if (withLocation.length <= RADAR_MAP_MARKER_LIMIT) return withLocation;
    return withLocation
      .map((sq: any) => ({ ...sq, __distanceFromCenter: getDistanceMeters(radarMapCenter, sq.actualLocation) }))
      .sort((a: any, b: any) => a.__distanceFromCenter - b.__distanceFromCenter)
      .slice(0, RADAR_MAP_MARKER_LIMIT);
  }, [diwaniyaAdminRadar.enriched, radarMapCenter]);

  const visibleHeatMapSquads = React.useMemo(() => {
    const withLocation = diwaniyaAdminRadar.heatPoints.filter((sq: any) => sq.actualLocation);
    if (withLocation.length <= RADAR_MAP_MARKER_LIMIT) return withLocation;
    return withLocation
      .map((sq: any) => ({ ...sq, __distanceFromCenter: getDistanceMeters(radarMapCenter, sq.actualLocation) }))
      .sort((a: any, b: any) => a.__distanceFromCenter - b.__distanceFromCenter)
      .slice(0, RADAR_MAP_MARKER_LIMIT);
  }, [diwaniyaAdminRadar.heatPoints, radarMapCenter]);

  useEffect(() => { setRiskPage(1); }, [riskFilter]);
  useEffect(() => { if (missingLocationPage > missingLocationTotalPages) setMissingLocationPage(missingLocationTotalPages); }, [missingLocationPage, missingLocationTotalPages]);
  useEffect(() => { if (riskPage > riskTotalPages) setRiskPage(riskTotalPages); }, [riskPage, riskTotalPages]);

  useEffect(() => {
    const el = radarMapRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setRadarMapSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [activeTab, radarMapMode]);

  const lonLatToWorldPixel = (lat: number, lng: number, zoom = RADAR_MAP_ZOOM) => {
    const sinLat = Math.sin((Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180);
    const scale = RADAR_TILE_SIZE * 2 ** zoom;
    return {
      x: ((lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
  };

  const radarTiles = React.useMemo(() => {
    if (!radarMapSize.width || !radarMapSize.height) return [];
    const center = lonLatToWorldPixel(radarMapCenter.lat, radarMapCenter.lng);
    const topLeft = {
      x: center.x - radarMapSize.width / 2,
      y: center.y - radarMapSize.height / 2,
    };
    const startX = Math.floor(topLeft.x / RADAR_TILE_SIZE);
    const endX = Math.floor((topLeft.x + radarMapSize.width) / RADAR_TILE_SIZE);
    const startY = Math.floor(topLeft.y / RADAR_TILE_SIZE);
    const endY = Math.floor((topLeft.y + radarMapSize.height) / RADAR_TILE_SIZE);
    const maxTile = 2 ** RADAR_MAP_ZOOM;
    const tiles: { key: string; url: string; left: number; top: number }[] = [];
    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${RADAR_MAP_ZOOM}-${wrappedX}-${y}`,
          url: `https://a.basemaps.cartocdn.com/light_nolabels/${RADAR_MAP_ZOOM}/${wrappedX}/${y}.png`,
          left: x * RADAR_TILE_SIZE - topLeft.x,
          top: y * RADAR_TILE_SIZE - topLeft.y,
        });
      }
    }
    return tiles;
  }, [radarMapSize.width, radarMapSize.height, radarMapCenter.lat, radarMapCenter.lng]);

  const getRadarMarkerPoint = (sq: any) => {
    if (sq?.actualLocation && radarMapSize.width && radarMapSize.height) {
      const center = lonLatToWorldPixel(radarMapCenter.lat, radarMapCenter.lng);
      const point = lonLatToWorldPixel(sq.actualLocation.lat, sq.actualLocation.lng);
      return {
        x: radarMapSize.width / 2 + (point.x - center.x),
        y: radarMapSize.height / 2 + (point.y - center.y),
      };
    }
    return {
      x: ((sq?.mapX || 50) / 100) * Math.max(1, radarMapSize.width),
      y: ((sq?.mapY || 50) / 100) * Math.max(1, radarMapSize.height),
    };
  };

  const getMetersPerPixel = (lat: number) => {
    const earthCircumference = 40075016.686;
    return (Math.cos((lat * Math.PI) / 180) * earthCircumference) / (RADAR_TILE_SIZE * 2 ** RADAR_MAP_ZOOM);
  };

  const getRadarRangePixels = (sq: any) => {
    const lat = Number(sq?.actualLocation?.lat ?? radarMapCenter.lat);
    const metersPerPixel = getMetersPerPixel(lat);
    const actualRadius = getSquadGeofenceDistance(sq) / Math.max(1, metersPerPixel);
    return Math.max(24, Math.min(180, actualRadius));
  };

  const getNearbyLocationCluster = (sq: any, allSquads: any[]) => {
    if (!sq?.actualLocation) return [sq];
    const thresholdMeters = Math.max(18, Math.min(80, getSquadGeofenceDistance(sq)));
    return allSquads
      .filter((item: any) => item?.actualLocation && getDistanceMeters(sq.actualLocation, item.actualLocation) <= thresholdMeters)
      .sort((a: any, b: any) => String(a.name || a.id).localeCompare(String(b.name || b.id), 'ar'));
  };

  const getClusterDisplayPoint = (sq: any, allSquads: any[]) => {
    const base = getRadarMarkerPoint(sq);
    const members = getNearbyLocationCluster(sq, allSquads);
    if (members.length <= 1) return { ...base, clusterCount: 1, clusterIndex: 0 };
    const index = Math.max(0, members.findIndex((item: any) => String(item.id) === String(sq.id)));
    let remaining = index;
    let ring = 1;
    let capacity = 8;
    while (remaining >= capacity) {
      remaining -= capacity;
      ring += 1;
      capacity = ring * 8;
    }
    const radius = Math.min(72, 10 + ring * 10);
    const angle = ((Math.PI * 2 * remaining) / capacity) - Math.PI / 2 + ring * 0.21;
    return {
      x: Math.max(18, Math.min(Math.max(18, radarMapSize.width - 18), base.x + Math.cos(angle) * radius)),
      y: Math.max(18, Math.min(Math.max(18, radarMapSize.height - 18), base.y + Math.sin(angle) * radius)),
      clusterCount: members.length,
      clusterIndex: index,
    };
  };

  const focusRadarOnSquad = (sq: any) => {
    if (!sq?.actualLocation) {
      toast.info('هذه الديوانية لا تملك لوكيشن مثبت');
      return;
    }
    setRadarMapCenter({ lat: sq.actualLocation.lat, lng: sq.actualLocation.lng });
    setActiveMapSquadId(sq.id);
    toast.success('تم تركيز الخريطة على الديوانية');
  };

  const scrollToSelectedSquadCard = () => {
    window.setTimeout(() => {
      selectedSquadCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selectedSquadCardRef.current?.focus?.();
    }, 80);
  };

  const selectRadarSquad = (sq: any) => {
    if (!sq) return;
    setActiveTab('radar');
    setActiveMapSquadId(sq.id);
    setRadarMapMode('map');
    scrollToSelectedSquadCard();
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

      <div className="w-full max-w-full flex gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-thin snap-x" dir="rtl">
        <button onClick={() => setActiveTab('leaderboard')} className={`shrink-0 snap-start px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'leaderboard' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>لوحة الصدارة 🔥</button>
        <button onClick={() => setActiveTab('squads')} className={`shrink-0 snap-start px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'squads' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>إدارة الدواوين 👥</button>
        <button onClick={() => setActiveTab('radar')} className={`shrink-0 snap-start px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'radar' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>رادار الانضمام الجغرافي 📍</button>
        <button onClick={() => setActiveTab('settings')} className={`shrink-0 snap-start px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>إعدادات التحديات ⚙️</button>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-sm overflow-hidden">
        <button 
          onClick={() => setLevelsBarExpanded(!levelsBarExpanded)} 
          className="w-full flex items-center justify-between gap-3 text-right group focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Crown className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                 شريط مستويات الدواوين 
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tiers.length} مستويات تتبع النقاط
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">اضغط لرؤية المستويات وهدايا النقاط بالتفصيل</div>
            </div>
          </div>
          <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 group-hover:bg-slate-100 transition">
            {levelsBarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {levelsBarExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeTab === 'leaderboard' && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="space-y-4">
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
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-xl text-slate-800">إدارة الدواوين (Squads CRM)</h3>
                      <p className="text-xs text-slate-500 mt-1">يتم احتساب النقاط بناءً على المبيعات: <strong>كل ١ دينار = ١ نقطة</strong> لجميع أعضاء الديوانية بناءً على أرقام هواتفهم.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddSquad(!showAddSquad)} 
                      className="px-5 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs hover:bg-slate-800 transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
                    >
                      <Plus size={16} /> إضافة ديوانية
                    </button>
                  </div>
                  <div className="relative w-full max-w-2xl">
                    <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ابحث باسم الديوانية، المؤسس، التلفون، أو الكود..." 
                      value={squadSearchQuery}
                      onChange={(e) => {
                        let val = normalizeArabicNumerals(e.target.value);
                        if (/^[0-9]*$/.test(val)) val = val.slice(0, 8);
                        setSquadSearchQuery(val);
                      }}
                      className="bg-slate-50 border border-slate-200 pr-11 pl-4 py-3.5 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 w-full shadow-sm" 
                    />
                  </div>
                </div>

                {/* Manual Register Diwaniya Form */}
                {showAddSquad && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-6 space-y-4"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" /> تسجيل ديوانية جديدة مع المؤسس
                      </h4>
                      <button 
                        onClick={() => setShowAddSquad(false)}
                        className="p-1 hover:bg-slate-250 rounded-lg text-slate-400 hover:text-slate-600 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-black text-slate-500 block mb-1">اسم الديوانية</label>
                        <input
                          type="text"
                          value={newSquadName}
                          onChange={(e) => setNewSquadName(e.target.value)}
                          placeholder="مثال: ديوانية العسعوسي"
                          className="w-full text-xs font-bold leading-6 bg-white border border-slate-200 p-2.5 rounded-xl text-right placeholder:text-slate-300 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-500 block mb-1">اسم المؤسس الأول</label>
                        <input
                          type="text"
                          value={newSquadFounder}
                          onChange={(e) => setNewSquadFounder(e.target.value)}
                          placeholder="مثال: صالح العسعوسي"
                          className="w-full text-xs font-bold leading-6 bg-white border border-slate-200 p-2.5 rounded-xl text-right placeholder:text-slate-300 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-500 block mb-1">رقم هاتف المؤسس</label>
                        <input
                          type="text"
                          value={newSquadPhone}
                          onChange={(e) => setNewSquadPhone(e.target.value)}
                          placeholder="مثال: 99xxxxxx"
                          className="w-full text-xs font-bold leading-6 bg-white border border-slate-200 p-2.5 rounded-xl text-right placeholder:text-slate-300 outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setShowAddSquad(false)}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl transition duration-150"
                      >
                        إلغاء
                      </button>
                      <button 
                        onClick={handleAddSquad}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition duration-150"
                      >
                        تأكيد وإضافة الديوانية
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-right whitespace-nowrap min-w-[850px]" dir="rtl">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-4 pr-6">اسم الديوانية</th>
                        <th className="p-4">المؤسس الرئيسي 👑</th>
                        <th className="p-4">المستوى</th>
                        <th className="p-4 text-center">النقاط الإجمالية</th>
                        <th className="p-4 text-center">الأعضاء</th>
                        <th className="p-4">أكثر عضو ولاءً (الملك)</th>
                        <th className="p-4 pl-6 text-left">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {squads
                          .filter(s => {
                            const query = squadSearchQuery.trim().toLowerCase();
                            if (!query) return true;
                            const nameMatch = (s.name || '').toLowerCase().includes(query);
                            const founderName = (s.founder || s.king || s.membersList?.[0]?.name || '');
                            const founderMatch = founderName.toLowerCase().includes(query);
                            const phoneMatch = (s.phone || '').includes(query);
                            const codeMatch = getSquadTemporaryCodes(s).some((code: any) => String(code?.code || code?.value || '').toLowerCase().includes(query));
                            return nameMatch || founderMatch || phoneMatch || codeMatch;
                          })
                          .map(s => {
                            const sortedArr = [...squads].sort((a,b) => (b.points || 0) - (a.points || 0));
                            const rank = sortedArr.findIndex(x => x.id === s.id) + 1;
                            const points = s.points || 0;
                            const displayTier = s.tier || getTierForPoints(points)?.name || 'شلة ديوانية';
                            const founderName = s.founder || s.king || s.membersList?.[0]?.name || 'غير محدد';
                            const founderPhone = s.phone || s.membersList?.[0]?.phone || '';
                            
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
                            <tr className={`transition-colors cursor-pointer ${expandedSquadId === s.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`} onClick={() => setExpandedSquadId(String(expandedSquadId) === String(s.id) ? null : s.id)}>
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
                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                  {editingSquadId === s.id ? (
                                    <div className="flex flex-col gap-1.5 max-w-[200px]">
                                      <input
                                        placeholder="اسم المؤسس"
                                        value={editedSquadFounder}
                                        onChange={(e) => setEditedSquadFounder(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                                      />
                                      <input
                                        placeholder="رقم التلفون"
                                        value={editedSquadPhone}
                                        onChange={(e) => setEditedSquadPhone(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                        {founderName}
                                        <span className="text-[9px] font-bold tracking-wide text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md">المؤسس الرئيسي 👑</span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                 <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${displayTier === 'شيوخ' ? 'bg-purple-100 text-purple-700' : displayTier === 'نواخذة' ? 'bg-amber-100 text-amber-700' : displayTier === 'عزوة' ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                   {displayTier}
                                 </span>
                              </td>
                              <td className="p-4 text-center font-bold text-slate-600">{(points).toLocaleString()} نقطة</td>
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
                                    href={`https://api.whatsapp.com/send?phone=${s.phone || founderPhone}&text=${encodeURIComponent(sanitizeWhatsAppText(`${waMsg}\n\nhttps://alturathkw.shop`))}`}
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
                              <tr className="bg-slate-50/50 table-row">
                                <td colSpan={7} className="p-0">
                                  <div className="p-4 pr-12 bg-blue-50/10 border-t border-b border-blue-100/50">
                                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">تفاصيل نقاط الأعضاء الفردية</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {s.membersList.map((member: any, i: number) => (
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

      {activeTab === 'radar' && (
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="max-w-7xl mx-auto space-y-6 text-right">
              <div className="relative overflow-hidden rounded-[32px] bg-slate-950 text-white border border-slate-800 shadow-2xl p-5 md:p-7">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-28 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-200 text-xs font-black">
                      <Radio className="w-4 h-4" /> مركز مراقبة الدواوين
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white">رادار الدواوين في الأدمن</h3>
                    <p className="text-sm text-slate-300 leading-7 max-w-3xl">
                      متابعة مواقع الدواوين، طلبات الانضمام، الأكواد المؤقتة، الطلبات الجماعية، والحضور الحالي من غير لمس الدفع أو إشعارات الدفع.
                    </p>
                  </div>

                  <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/5 px-4 py-3 rounded-3xl border border-white/10" dir="rtl">
                    <span className="text-xs font-bold text-slate-300 whitespace-nowrap">مدى رادار الانضمام:</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={geofenceDistance}
                      onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                      className="w-full sm:w-56 accent-amber-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-sm font-black text-amber-200 min-w-[70px] text-center bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                      {geofenceDistance}م
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                {[
                  { label: 'طلبات انضمام معلقة', value: diwaniyaAdminRadar.pending.length, hint: 'تحتاج متابعة المعزب', tone: 'amber', icon: <BellRing className="w-5 h-5" /> },
                  { label: 'مواقع غير مثبتة', value: diwaniyaAdminRadar.missingLocation.length, hint: 'لن تظهر بالرادار', tone: 'rose', icon: <MapPin className="w-5 h-5" /> },
                  { label: 'دواوين متقاربة', value: diwaniyaAdminRadar.duplicateWarnings.length, hint: 'راجع التداخل الجغرافي', tone: 'orange', icon: <Navigation className="w-5 h-5" /> },
                  { label: 'طلبات جماعية مفتوحة', value: diwaniyaAdminRadar.openGroupOrders.length, hint: 'نشاط مباشر', tone: 'emerald', icon: <Users className="w-5 h-5" /> },
                  { label: 'أكواد دخول فعالة', value: diwaniyaAdminRadar.activeCodes.length, hint: 'ضيوف مؤقتون', tone: 'indigo', icon: <Copy className="w-5 h-5" /> },
                ].map((card: any) => (
                  <div key={card.label} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-${card.tone}-50 text-${card.tone}-600 border border-${card.tone}-100`}>
                        {card.icon}
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-black text-slate-900">{card.value}</div>
                        <div className="text-[10px] font-bold text-slate-400">{card.hint}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs font-black text-slate-700">{card.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-[1.35fr_0.9fr] gap-6">
                <div className="bg-white rounded-[32px] border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-4 mb-5">
                    <div>
                      <h4 className="font-black text-slate-900 text-lg flex items-center gap-2"><Compass className="w-5 h-5 text-amber-500" /> خريطة الدواوين</h4>
                      <p className="text-xs text-slate-500 mt-1">تبويبين منفصلين: خريطة مكبرة لمواقع الدواوين، وخريطة حرارية تجمع النشاط التشغيلي حسب كل ديوانية.</p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button type="button" onClick={() => setRadarMapMode('map')} className={`px-3 py-2 rounded-xl text-xs font-black transition ${radarMapMode === 'map' ? 'bg-white text-amber-700 shadow-sm ring-2 ring-blue-500/70' : 'text-slate-500 hover:text-slate-800'}`}>الخريطة الحالية</button>
                        <button type="button" onClick={() => setRadarMapMode('heatmap')} className={`px-3 py-2 rounded-xl text-xs font-black transition ${radarMapMode === 'heatmap' ? 'bg-white text-rose-700 shadow-sm ring-2 ring-blue-500/70' : 'text-slate-500 hover:text-slate-800'}`}>الخريطة الحرارية</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-black">
                        <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">موقع مثبت</span>
                        <span className="px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">غير مثبت</span>
                        <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">طلبات معلقة</span>
                      </div>
                    </div>
                  </div>

                  <div ref={radarMapRef} className="relative border border-slate-200 bg-[#eef2f0] rounded-3xl overflow-hidden aspect-[4/3] min-h-[360px] sm:min-h-[460px] md:min-h-[620px] w-full">
                    <div className="absolute inset-0">
                      {radarTiles.map((tile) => (
                        <img
                          key={tile.key}
                          src={tile.url}
                          alt=""
                          className="absolute w-[256px] h-[256px] max-w-none select-none pointer-events-none"
                          style={{ left: tile.left, top: tile.top }}
                          draggable={false}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-white/10 pointer-events-none" />

                    {radarMapMode === 'map' && diwaniyaAdminRadar.missingLocation.length > 0 && (
                      <div className="absolute right-3 top-3 z-30 w-[150px] sm:w-[180px] rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-md shadow-sm p-2 text-right" dir="rtl">
                        <div className="mb-1.5 flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black text-slate-500">بدون لوكيشن</span>
                          <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-white">{diwaniyaAdminRadar.missingLocation.length}</span>
                        </div>
                        <div className="max-h-[185px] overflow-auto space-y-1 pr-0.5">
                          {visibleMissingLocation.map((sq: any) => (
                            <button
                              key={`missing-name-${sq.id}`}
                              type="button"
                              onClick={() => selectRadarSquad(sq)}
                              className={`block w-full truncate rounded-xl border px-2.5 py-1.5 text-right text-[11px] font-black transition ${String(activeMapSquadId) === String(sq.id) ? 'border-amber-300 bg-amber-50 text-slate-950' : 'border-slate-100 bg-white/75 text-slate-700 hover:border-amber-200 hover:bg-amber-50/50'}`}
                              title={sq.name}
                            >
                              {sq.name}
                            </button>
                          ))}
                        </div>
                        {missingLocationTotalPages > 1 && (
                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] font-black text-slate-500">
                            <button type="button" onClick={() => setMissingLocationPage((page) => Math.min(missingLocationTotalPages, page + 1))} disabled={missingLocationPage >= missingLocationTotalPages} className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40">التالي</button>
                            <span>{Math.min(missingLocationPage, missingLocationTotalPages)} / {missingLocationTotalPages}</span>
                            <button type="button" onClick={() => setMissingLocationPage((page) => Math.max(1, page - 1))} disabled={missingLocationPage <= 1} className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40">السابق</button>
                          </div>
                        )}
                      </div>
                    )}

                    {radarMapMode === 'heatmap' && (
                      <div className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-rose-100 bg-white/92 p-3 text-right shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-end gap-2 font-black text-slate-800 text-xs"><span>حرارة النشاط</span><Activity className="w-4 h-4 text-rose-500" /></div>
                        <p className="text-[10px] text-slate-500 leading-5 mt-1">الرقم هو عدد عناصر النشاط. حجم الدائرة فقط يوضح وزن النشاط.</p>
                      </div>
                    )}

                    {radarMapMode === 'map' && visibleMapSquads.map((sq: any) => {
                      const point = getClusterDisplayPoint(sq, visibleMapSquads);
                      const range = getRadarRangePixels(sq);
                      const isActive = String(activeMapSquadId) === String(sq.id);
                      const isBusy = sq.presence.length > 0 || sq.pendingRequests.length > 0 || sq.openOrder;
                      return (
                        <span
                          key={`range-${sq.id}`}
                          className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none transition-opacity ${isActive ? 'border-amber-400/70 bg-amber-300/12 opacity-100' : isBusy ? 'border-emerald-400/35 bg-emerald-300/10 opacity-70' : 'border-slate-400/25 bg-white/10 opacity-45'}`}
                          style={{ left: point.x, top: point.y, width: range * 2, height: range * 2 }}
                          title={`مدى الديوانية ${getSquadGeofenceDistance(sq)}م`}
                        />
                      );
                    })}

                    {radarMapMode === 'heatmap' && visibleHeatMapSquads.map((sq: any) => {
                      const point = getClusterDisplayPoint(sq, visibleHeatMapSquads);
                      return (
                        <button
                          type="button"
                          key={`heat-${sq.id}`}
                          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
                          style={{ left: point.x, top: point.y }}
                          onClick={() => selectRadarSquad(sq)}
                          title={`${sq.name} - العدد: ${sq.heatValue || 0} | طلبات: ${sq.heatBreakdown?.orders || 0} | حضور: ${sq.heatBreakdown?.presence || 0} | انضمام: ${sq.heatBreakdown?.pending || 0} | أكواد: ${sq.heatBreakdown?.codes || 0}`}
                        >
                          <span
                            className="absolute rounded-full bg-rose-400/35 border border-rose-300/50 blur-[1px] group-hover:bg-rose-500/45 transition-all"
                            style={{ width: `${34 + (sq.heatLevel || 0.2) * 96}px`, height: `${34 + (sq.heatLevel || 0.2) * 96}px`, right: `${-17 - (sq.heatLevel || 0.2) * 48}px`, top: `${-17 - (sq.heatLevel || 0.2) * 48}px` }}
                          />
                          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white border-2 border-white shadow-xl text-[9px] font-black">{sq.heatValue || 0}</span>
                          {point.clusterCount > 1 && <span className="absolute -top-3 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[9px] font-black text-white border border-white shadow-lg">{point.clusterCount}</span>}
                          <span className={`pointer-events-none absolute bottom-full mb-2 max-w-[160px] truncate whitespace-nowrap text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xl border bg-white text-slate-800 border-rose-200 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ${point.x > radarMapSize.width * 0.62 ? 'right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'}`}>{sq.actualLocation ? sq.name : ''}</span>
                        </button>
                      );
                    })}

                    {radarMapMode === 'map' && visibleMapSquads.map((sq: any) => {
                      const isActive = String(activeMapSquadId) === String(sq.id);
                      const hasLocation = Boolean(sq.actualLocation);
                      const hasPending = sq.pendingRequests.length > 0;
                      const point = getClusterDisplayPoint(sq, visibleMapSquads);
                      const isBusy = sq.presence.length > 0 || hasPending || sq.openOrder;
                      return (
                        <button
                          type="button"
                          key={sq.id}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 group text-right ${isActive ? 'z-40' : 'z-20'}`}
                          style={{ left: point.x, top: point.y }}
                          onClick={() => selectRadarSquad(sq)}
                        >
                          <span className={`absolute -inset-4 rounded-full blur-md transition-all ${hasPending ? 'bg-amber-400/30 animate-pulse' : hasLocation ? 'bg-emerald-400/20' : 'bg-rose-400/20'} ${isActive ? 'scale-125' : 'scale-100'}`} />
                          <span className={`relative flex items-center justify-center rounded-full border-2 shadow-lg transition-all ${isBusy ? 'w-6 h-6 animate-pulse' : 'w-5 h-5'} ${isActive ? 'scale-125 bg-slate-950 border-amber-300' : hasLocation ? 'bg-emerald-500 border-white' : 'bg-slate-400 border-white'}`}>
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                          </span>
                          {point.clusterCount > 1 && <span className="absolute -top-4 -right-4 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[9px] font-black text-white border border-white shadow-lg">{point.clusterCount}</span>}
                          <span className={`pointer-events-none absolute bottom-full mb-2 max-w-[160px] truncate whitespace-nowrap text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xl border transition-opacity ${point.x > radarMapSize.width * 0.62 ? 'right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'} ${isActive ? 'opacity-100 bg-slate-950 text-white border-amber-300' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-white text-slate-800 border-slate-200 group-hover:border-amber-300'}`}>
                            {hasLocation ? sq.name : ''}
                            {hasPending && hasLocation ? <span className="mr-1 text-amber-500">• {sq.pendingRequests.length}</span> : null}
                            {point.clusterCount > 1 ? <span className="mr-1 text-slate-400">مجموعة {point.clusterIndex + 1}/{point.clusterCount}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const selected = diwaniyaAdminRadar.enriched.find((sq: any) => String(sq.id) === String(activeMapSquadId));
                    return selected ? (
                      <div ref={selectedSquadCardRef} tabIndex={-1} className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm space-y-4 outline-none ring-0 focus:ring-4 focus:ring-amber-200/70 transition-shadow">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black border ${selected.actualLocation ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                              {selected.actualLocation ? 'موقع مثبت من العميل' : 'غير مثبت على الخريطة'}
                            </span>
                            <h4 className="font-black text-slate-900 text-xl mt-2">{selected.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">{selected.founder || selected.king || 'المعزب غير محدد'} · {selected.phone || selected.membersList?.[0]?.phone || 'لا يوجد رقم'}</p>
                          </div>
                          <div className="text-left space-y-2">
                            <div>
                              <div className="text-2xl font-black text-amber-600">{(selected.points || 0).toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400 font-bold">نقطة</div>
                            </div>
                            {selected.actualLocation && (
                              <button type="button" onClick={() => focusRadarOnSquad(selected)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black hover:bg-amber-100 transition">
                                <Compass size={13} /> ركز
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><div className="text-[10px] text-slate-400 font-bold">الأعضاء</div><div className="text-lg font-black text-slate-800">{selected.membersCount}</div></div>
                          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3"><div className="text-[10px] text-amber-700 font-bold">طلبات دخول</div><div className="text-lg font-black text-amber-700">{selected.pendingRequests.length}</div></div>
                          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3"><div className="text-[10px] text-emerald-700 font-bold">موجودين الآن</div><div className="text-lg font-black text-emerald-700">{selected.presence.length}</div></div>
                          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3"><div className="text-[10px] text-indigo-700 font-bold">مدى الدخول</div><div className="text-lg font-black text-indigo-700">{getSquadGeofenceDistance(selected)}م</div></div>
                        </div>

                        <div ref={coordinatesBoxRef} tabIndex={-1} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs leading-6 outline-none">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="font-black text-slate-800">{selected.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5">الإحداثيات</div>
                            </div>
                            <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                          </div>
                          {selected.actualLocation ? (
                            <>
                              <div className="font-mono text-slate-600" dir="ltr">{selected.actualLocation.lat.toFixed(6)}, {selected.actualLocation.lng.toFixed(6)}</div>
                              <div className="mt-2 text-[11px] font-bold text-amber-700">مدى الانضمام الحالي: {getSquadGeofenceDistance(selected)}م</div>
                            </>
                          ) : (
                            <div className="text-rose-600 font-bold">ماكو إحداثيات حقيقية. ثبّت الموقع من برنامج العميل عشان تظهر على الخريطة بدقة.</div>
                          )}
                        </div>

                        {selected.pendingRequests.length > 0 && (
                          <div className="space-y-2">
                            <div className="font-black text-slate-800 text-sm">طلبات الانضمام المعلقة</div>
                            {selected.pendingRequests.slice(0, 4).map((request: any, index: number) => (
                              <div key={request.id || index} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                                <div>
                                  <div className="font-black text-slate-800 text-sm">{request.name || request.customerName || 'ضيف قريب'}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">{request.phone || request.customerPhone || 'بدون رقم'}</div>
                                </div>
                                <div className="text-left text-xs font-black text-amber-700">{Math.round(Number(request.distance || request.distanceMeters || 0)) || '—'}م</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm text-center text-slate-500 min-h-[280px] flex flex-col items-center justify-center">
                        <Compass className="w-10 h-10 text-amber-400 mb-3" />
                        <div className="font-black text-slate-700">اختر ديوانية من الخريطة</div>
                        <p className="text-xs mt-2 leading-6">راح تظهر تفاصيل الموقع، الطلبات المعلقة، الحضور، الأكواد، والطلب الجماعي.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm">
                  <h4 className="font-black text-slate-900 flex items-center gap-2 mb-4"><BellRing className="w-5 h-5 text-amber-500" /> أكثر دواوين عليها طلبات انضمام</h4>
                  <div className="space-y-3">
                    {diwaniyaAdminRadar.topJoinSquads.some((sq: any) => sq.pendingRequests.length > 0) ? diwaniyaAdminRadar.topJoinSquads.filter((sq: any) => sq.pendingRequests.length > 0).map((sq: any) => (
                      <button key={sq.id} type="button" onClick={() => selectRadarSquad(sq)} className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 p-3 transition-all">
                        <div><div className="font-black text-slate-800 text-sm">{sq.name}</div><div className="text-[11px] text-slate-500">متوسط قرب الطلب: {sq.avgRequestDistance ? `${sq.avgRequestDistance}م` : 'غير متوفر'}</div></div>
                        <div className="text-xl font-black text-amber-600">{sq.pendingRequests.length}</div>
                      </button>
                    )) : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-500 text-center">ماكو طلبات معلقة حالياً.</div>}
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm">
                  <h4 className="font-black text-slate-900 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-rose-500" /> دواوين تحتاج تثبيت موقع</h4>
                  <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                    {diwaniyaAdminRadar.missingLocation.length > 0 ? diwaniyaAdminRadar.missingLocation.map((sq: any) => (
                      <button key={sq.id} type="button" onClick={() => selectRadarSquad(sq)} className="w-full rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-right hover:bg-rose-50 transition-all">
                        <div className="font-black text-slate-800 text-sm">{sq.name}</div>
                        <div className="text-[11px] text-rose-700 mt-1">لن تظهر للضيوف القريبين إلا بعد تثبيت موقعها من برنامج العميل.</div>
                      </button>
                    )) : <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-700 text-center">كل الدواوين لديها مواقع مثبتة.</div>}
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm">
                  <h4 className="font-black text-slate-900 flex items-center gap-2 mb-4"><Navigation className="w-5 h-5 text-orange-500" /> تحذيرات التداخل الجغرافي</h4>
                  <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                    {diwaniyaAdminRadar.duplicateWarnings.length > 0 ? diwaniyaAdminRadar.duplicateWarnings.map((item: any, index: number) => (
                      <div key={index} className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
                        <div className="font-black text-slate-800 text-sm">{item.first.name} + {item.second.name}</div>
                        <div className="text-[11px] text-orange-700 mt-1">المسافة بينهما تقريباً {item.distance}م، راجعها حتى لا تظهر للضيف ديوانية غير مقصودة.</div>
                      </div>
                    )) : <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-500 text-center">ماكو دواوين متداخلة ضمن مدى الرادار الحالي.</div>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center gap-2"><Filter className="w-5 h-5 text-rose-500" /> فلتر المخاطر للدواوين</h4>
                    <p className="text-xs text-slate-500 mt-1">يعرض الدواوين بلا موقع، المتداخلة، أو التي عليها طلبات معلقة لمدة طويلة.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['all', 'كل المخاطر'],
                      ['missing', 'بلا موقع'],
                      ['overlap', 'متداخلة'],
                      ['pending', 'طلبات معلقة'],
                      ['stale', 'متأخرة 24س+'],
                    ].map(([key, label]: any) => (
                      <button key={key} type="button" onClick={() => setRiskFilter(key)} className={`px-3 py-2 rounded-xl text-xs font-black border transition ${riskFilter === key ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredRiskSquads.length > 0 ? visibleRiskSquads.map((sq: any) => {
                    const hasOverlap = diwaniyaAdminRadar.duplicateWarnings.some((w: any) => String(w.first.id) === String(sq.id) || String(w.second.id) === String(sq.id));
                    return (
                      <button key={`risk-${sq.id}`} type="button" onClick={() => selectRadarSquad(sq)} className="text-right rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-rose-200 hover:shadow-md transition-all p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-900">{sq.name}</div>
                            <div className="text-[11px] text-slate-500 mt-1">{sq.founder || sq.king || 'المعزب غير محدد'}</div>
                          </div>
                          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-black">
                          {!sq.actualLocation && <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700">بلا موقع</span>}
                          <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700">مدى الدخول {getSquadGeofenceDistance(sq)}م</span>
                          {hasOverlap && <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-700">تداخل موقع</span>}
                          {sq.pendingRequests.length > 0 && <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700">{sq.pendingRequests.length} طلب معلق</span>}
                          {sq.staleRequests.length > 0 && <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700">{sq.staleRequests.length} متأخر</span>}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="md:col-span-2 xl:col-span-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center text-sm font-black text-emerald-700">ماكو مخاطر ضمن الفلتر الحالي.</div>
                  )}
                </div>
                {filteredRiskSquads.length > RADAR_LIST_PAGE_SIZE && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-black text-slate-600">
                    <span>عرض {visibleRiskSquads.length} من {filteredRiskSquads.length} ديوانية</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage <= 1} className="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">السابق</button>
                      <span className="px-3">{Math.min(riskPage, riskTotalPages)} / {riskTotalPages}</span>
                      <button type="button" onClick={() => setRiskPage((page) => Math.min(riskTotalPages, page + 1))} disabled={riskPage >= riskTotalPages} className="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">التالي</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full">
                <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm">
                  <h4 className="font-black text-slate-900 flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-emerald-500" /> إعدادات ومزايا الدواوين</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      { title: 'الحضور الآن', value: diwaniyaAdminRadar.activePresence.reduce((sum: number, sq: any) => sum + sq.presence.length, 0), hint: 'عدد الربع اللي ضغطوا أنا وصلت' },
                      { title: 'طلبات جماعية مفتوحة', value: diwaniyaAdminRadar.openGroupOrders.length, hint: 'للمراجعة التشغيلية بدون دخول الدفع' },
                      { title: 'أكواد دخول فعالة', value: diwaniyaAdminRadar.activeCodes.reduce((sum: number, sq: any) => sum + sq.tempCodes.length, 0), hint: 'أكواد ضيوف فعالة وغير مستخدمة' },
                      { title: 'دواوين نشطة اليوم', value: new Set([...diwaniyaAdminRadar.activePresence.map((sq: any) => sq.id), ...diwaniyaAdminRadar.openGroupOrders.map((sq: any) => sq.id)]).size, hint: 'حضور أو طلب جماعي بدون تكرار' },
                    ].map((item: any) => (
                      <div key={item.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                        <div className="text-[11px] font-black text-slate-500">{item.title}</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">{item.value}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">{item.hint}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

    </div>
  );
};

const sanitizeWhatsAppText = (text: string) =>
  String(text || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
