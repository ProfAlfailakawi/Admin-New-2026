export type StudioRealityMode = 'human' | 'restaurant' | 'menu' | 'luxury' | 'finalBoss';
export type StudioBackgroundPresetId =
  | 'wood-table'
  | 'marble-table'
  | 'pickup-counter'
  | 'open-kitchen'
  | 'window-booth'
  | 'delivery-packaging'
  | 'busy-dining-blur'
  | 'neutral-menu'
  | 'home-table'
  | 'diwaniya-table'
  | 'chalet-spread'
  | 'farm-gathering'
  | 'jakhour-setup'
  | 'zowara-spread'
  | 'kuwait-towers'
  | 'mubarakiya'
  | 'bidaa';

export const STUDIO_FORBIDDEN_REALITY_OBJECTS = [
  'دلة', 'دلال', 'مبخر', 'مباخر', 'بخور', 'عود', 'سدو', 'فانوس', 'فوانيس', 'قهوة', 'قهوت', 'بن', 'فنجان', 'فناجين',
  'dallah', 'arabic coffee pot', 'arabic coffee', 'coffee cup', 'coffee beans', 'incense', 'bukhoor', 'oud burner', 'sadu', 'lantern', 'used tissue', 'dirty tissue', 'used napkin', 'dirty napkin', 'crumpled tissue', 'messy tissue', 'kleenex', 'paper trash', 'table trash', 'leftover crumbs', 'dirty table', 'stained napkin'
];

export const STUDIO_REALITY_NEGATIVE_PROMPT = `STRICT REALITY BAN: no dallah, no Arabic coffee pot, no Arabic coffee, no coffee cups, no coffee beans, no espresso/cappuccino props, no incense, no bukhoor, no oud burner, no sadu patterns, no lanterns, no fake heritage props, no crosses, no cross-shaped objects, no crucifix, no statues, no idols, no figurines, no religious icons, no shrine-like decor, no worship symbols, no fantasy venue, no palace, no CGI, no 3D render, no plastic food, no floating objects, no fake smoke, no neon overkill, no text, no letters, no logos, no watermark, no used tissue, no dirty tissue, no used napkin, no crumpled kleenex, no stained napkin, no paper trash, no dirty table, no food mess leftovers, no leftover crumbs. Keep all backgrounds believable, ordinary, human-photographed, and Kuwait-order-real.`;


export const RESTAURANT_MENU_IDENTITY = `
KUWAIT HOME ORDER IDENTITY:
- This brand is a Kuwaiti home-order and delivery kitchen: rice dishes (ayoush), fish/seafood, machboos-style meals, stuffed vegetables (mahshi), grape leaves, and occasional grills, delivered to homes, diwaniyas, chalets, farms, jakhours, zowaras, and gatherings.
- Visual suggestions must fit Kuwaiti home orders, family gatherings, diwaniyas, chalets, farms, jakhours, and delivery moments; not a cafe, dessert shop, coffee brand, luxury lounge, or Western fast-food concept.
- Never add coffee, Arabic coffee, cups, dallah, incense, bukhoor, sadu, lanterns, or heritage props as decoration.
`;

export const RESTAURANT_REALITY_POLICY = `
HUMAN KUWAITI ORDER REALITY POLICY:
- The image must feel photographed by a real human in Kuwait for a real home order, delivery, diwaniya, chalet, farm, jakhour, or family gathering; not generated digitally.
- Use believable Kuwaiti order elements only: home table, diwaniya table, chalet serving surface, delivery packaging, kitchen prep counter, simple clean unused napkin, water cup, neutral wall, soft bokeh, and practical human surfaces.
- Avoid perfect symmetry, fantasy decor, palace interiors, exaggerated luxury, fake Kuwaiti heritage props, artificial smoke, over-polished CGI surfaces, and any dirty or used tissues/napkins, paper trash, leftover crumbs, or stained surfaces.
- Use natural lens behavior: 35mm or 50mm perspective, mild depth of field, slight lens softness, correct scale, believable shadows, realistic reflections, and ordinary imperfections.
- Keep empty clean areas for overlay/logo without creating text inside the generated image.
- IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO LOGOS, NO SIGNATURES, NO WATERMARKS ANYWHERE INSIDE THE GENERATED IMAGE.
`;

export const PRODUCT_LOCK_POLICY = `
LOCK THE FOOD PRODUCT:
- Keep the original dish/plate/bowl exactly recognizable: same food, same plate, same garnish, same sauce, same portion, same edges, same color identity.
- Do not invent ingredients. Do not replace the plate. Do not add/remove toppings. Do not change the recipe.
- Allowed improvements only: cleaner crop, gentle edge cleanup, realistic lighting integration, believable shadows, background replacement, table surface, depth of field.
- Treat the dish as a real photographed object placed into a believable Kuwaiti order/gathering environment.
`;

export const STUDIO_REALITY_MODES: Record<StudioRealityMode, { label: string; prompt: string }> = {
  human: {
    label: 'تصوير بشري / آيفون',
    prompt: 'Style: believable iPhone-style Kuwaiti home-order photo, handheld human framing, natural indoor light, slight imperfection, realistic colors, no studio perfection.'
  },
  restaurant: {
    label: 'طلب كويتي واقعي',
    prompt: 'Style: real Kuwaiti home-order photography, believable home/diwaniya/chalet table scene, warm practical light, no dine-in restaurant implication, no fake heritage props.'
  },
  menu: {
    label: 'منيو طلبات نظيف',
    prompt: 'Style: professional order-menu photography, clean table surface, controlled soft light, product remains true, realistic shadows, commercial but still photographed not rendered.'
  },
  luxury: {
    label: 'إعلان بشري فاخر',
    prompt: 'Style: premium human-shot Kuwaiti food order ad, elegant but believable home/delivery/gathering environment, restrained luxury, natural materials, no fantasy decor, no CGI gloss.'
  },
  finalBoss: {
    label: 'Reality Final Boss',
    prompt: 'Style: ultra-believable human Kuwaiti order photography. The scene must pass as a real photo taken for a home, diwaniya, chalet, farm, jakhour, zowara, or delivery: imperfect handheld framing, real lens softness, grounded scale, believable shadows, ordinary surfaces, no synthetic polish, no fantasy styling.'
  }
};

export const REAL_RESTAURANT_BACKGROUNDS: Record<StudioBackgroundPresetId, { label: string; prompt: string }> = {
  'wood-table': {
    label: 'طاولة خشب طلبات',
    prompt: 'Background: real medium-dark wooden table for a Kuwaiti order, small napkin, soft warm practical light, ordinary believable home/delivery setup.'
  },
  'marble-table': {
    label: 'رخام أبيض هادئ',
    prompt: 'Background: real white or off-white marble table for a clean Kuwaiti order/menu setup, subtle reflection, neutral wall blur, realistic shadows and scale.'
  },
  'pickup-counter': {
    label: 'كاونتر استلام',
    prompt: 'Background: real pickup/delivery prep counter, stainless edge or neutral counter, faint blurred shelves, practical takeout environment, no fake signage or text.'
  },
  'open-kitchen': {
    label: 'مطبخ تحضير حقيقي',
    prompt: 'Background: real open kitchen pass, stainless steel, soft bokeh, practical prep area, clean but not perfect, believable kitchen order workflow without visible text.'
  },
  'window-booth': {
    label: 'جلسة قرب الزجاج',
    prompt: 'Background: real table near a glass window, natural daylight, blurred street or storefront feeling, realistic Kuwait order depth, no readable signs.'
  },
  'delivery-packaging': {
    label: 'توصيل وسفري',
    prompt: 'Background: realistic takeout/delivery setup, plain packaging, paper bag, counter or table surface, human everyday commercial feel, no fake branding text.'
  },
  'busy-dining-blur': {
    label: 'يمعة Blur',
    prompt: 'Background: softly blurred busy dining area with indistinct people silhouettes only, no identifiable faces, warm lights, realistic distance and depth.'
  },
  'neutral-menu': {
    label: 'خلفية منيو نظيفة',
    prompt: 'Background: neutral professional order-menu setup, matte table surface, simple real wall, controlled soft shadows, no props except minimal napkin/cutlery if needed.'
  },

  'home-table': {
    label: 'سفرة بيتية كويتية',
    prompt: 'Background: real Kuwaiti home dining table, tidy family serving setup, natural indoor light, ordinary believable surface, no restaurant seating, no fake heritage props.'
  },
  'diwaniya-table': {
    label: 'ديوانية واقعية',
    prompt: 'Background: real modern Kuwaiti diwaniya serving table, group order feeling, soft warm light, subtle seating blur, no identifiable faces, no dallah, no bukhoor, no sadu.'
  },
  'chalet-spread': {
    label: 'شاليه / طلعة',
    prompt: 'Background: believable Kuwaiti chalet order setup, casual weekend serving surface, daylight or soft sunset feel, relaxed gathering mood, no restaurant interior.'
  },
  'farm-gathering': {
    label: 'مزرعة',
    prompt: 'Background: simple Kuwaiti farm gathering table, practical outdoor shade, clean serving setup, believable human photo, no theatrical heritage decoration.'
  },
  'jakhour-setup': {
    label: 'جاخور',
    prompt: 'Background: practical Kuwaiti jakhour gathering setup, simple table, warm realistic light, food order for friends, clean and believable, no clutter or fantasy props.'
  },
  'zowara-spread': {
    label: 'زوارة / عزيمة',
    prompt: 'Background: real Kuwaiti family zowara spread at home, generous but tidy serving, warm family atmosphere, premium but believable, no restaurant context.'
  },
  'kuwait-towers': {
    label: 'أبراج الكويت',
    prompt: 'Background: the famous Kuwait Towers in the soft sunset background with warm light bokeh blur, on a clean outdoor table with realistic shadow casting.'
  },
  'mubarakiya': {
    label: 'سوق المباركية',
    prompt: 'Background: authentic Kuwait Mubarakiya traditional souk atmosphere beautifully out of focus with warm lighting, cozy heritage mood.'
  },
  'bidaa': {
    label: 'شاطئ البدع',
    prompt: 'Background: soft sandy beach of Al-Bidaa coastal shoreline in Kuwait at golden hour sunset, gentle sea depth, placing the food on a beautiful clean seaside wooden table.'
  },
};



export const REALITY_FINAL_BOSS_POLICY = `
REALITY FINAL BOSS OVERRIDE:
- Make the result boringly believable before making it beautiful. Real Kuwaiti order/gathering first, advertisement second.
- Avoid the common synthetic tells: over-perfect lighting, glossy fake tabletops, unreal depth blur, empty luxury halls, decorative clutter, duplicated objects, floating props, and cinematic smoke.
- Use one specific ordinary location: a real dine-in table, pickup counter, window booth, open kitchen pass, delivery counter, or clean menu table.
- Add tiny human-camera imperfections: slight off-axis angle, real contact shadows, uneven napkin/cup placement, realistic table wear, practical indoor light.
- If unsure, choose a simpler real background rather than a dramatic one.
`;

export const STRICT_PLATE_LOCK_POLICY = `
STRICT PLATE LOCK:
- The original plate/bowl and the food identity are sacred. Do not swap the plate, change the food shape, change toppings, invent sauces, add garnish, or remove parts.
- Preserve the original dish silhouette and portion. Only clean the visible crop/edges and blend it into a believable table/environment.
- Background, light, shadow, lens, and table are allowed to change. Food construction is not.
`;

export const REALITY_AUDIT_RUBRIC = `
REALITY AUDIT RUBRIC:
Evaluate whether the image looks like a human Kuwaiti order/gathering photo. Check: believable background, correct dish preservation, natural shadows, realistic scale, lens behavior, no synthetic/fantasy decor, no text/logos inside image, no forbidden heritage props.
Return concise Arabic notes and a 0-100 realism score.
`;

export const buildProductRealityPrompt = ({ theme, mood, mode, background }: { theme?: string; mood?: string; mode?: StudioRealityMode; background?: StudioBackgroundPresetId }) => {
  const modePrompt = STUDIO_REALITY_MODES[mode || 'restaurant']?.prompt || STUDIO_REALITY_MODES.restaurant.prompt;
  const backgroundPrompt = REAL_RESTAURANT_BACKGROUNDS[background || 'wood-table']?.prompt || REAL_RESTAURANT_BACKGROUNDS['wood-table'].prompt;
  return `${PRODUCT_LOCK_POLICY}\n${STRICT_PLATE_LOCK_POLICY}\n${RESTAURANT_MENU_IDENTITY}\n${RESTAURANT_REALITY_POLICY}\n${REALITY_FINAL_BOSS_POLICY}\n${modePrompt}\n${backgroundPrompt}\nUser theme: ${theme || 'طلب كويتي واقعي'}. Mood: ${mood || 'دافئ'}.\n${STUDIO_REALITY_NEGATIVE_PROMPT}`;
};

export const buildTextRealityPrompt = (purpose: string, subject: string, formatHint = '') => `${RESTAURANT_MENU_IDENTITY}\n${RESTAURANT_REALITY_POLICY}\n${REALITY_FINAL_BOSS_POLICY}\nPurpose: ${purpose}.\nSubject: ${subject}.\n${formatHint}\nChoose one believable Kuwaiti order/gathering location from the internal library: home table, diwaniya, chalet, farm, jakhour, zowara, delivery packaging, prep counter, or clean menu setup. Build the image as a plausible human photo in Kuwait for home orders and delivery: ordinary surfaces, natural scale, practical lighting, no fake event props, no dine-in restaurant implication. The final image must make viewers ask who photographed it, not which engine made it.\n${STUDIO_REALITY_NEGATIVE_PROMPT}`;


export const ALTURATH_ADVANCED_REALISM_POLICY = `
ALTURATH ADVANCED REALISM POLICY:
- Dish fingerprint comes before styling. Preserve the dish identity, protein, portion, vessel, texture, and serving logic.
- Never let a prettier composition transform the dish into another food.
- Delivery suitability matters: the food must look credible for a delivery-only kitchen, not a dine-in restaurant.
- Menu photos must be clearer and calmer than social ad photos: clean background, obvious product, minimal props.
- Clutter must be actively reduced: no visual noise, no decorative overload, no accidental religious symbols, no statues, no idols.
- Truth-first: if beauty conflicts with realism, choose realism.
`;
