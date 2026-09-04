// Optional frontend copy map for Smart Studio labels.
// Apply wherever the old studio labels are defined.

export const SMART_STUDIO_STEPS = [
  {
    id: "idea",
    title: "فكرة اختيارية",
    description: "اكتب فكرتك أو اتركها فاضية. التوليد يبدأ مباشرة بدون ما نجبرك تختار.",
    placeholder: "مثال: أبي الطبق على طاولة فاخرة بإضاءة غروب...",
    isOptional: true,
    primaryAction: "ولّد مباشرة",
    secondaryAction: "التالي للاختيارات"
  },
  {
    id: "style",
    title: "أسلوب الصورة",
    description: "اختر جودة/طابع التصوير فقط.",
    options: [
      { id: "professional_food_photo", label: "تصوير طعام احترافي", helper: "عدسة، إضاءة، تكوين، واقعية تجارية." },
      { id: "premium_menu", label: "منيو فاخر", helper: "نظيف وهادئ ومناسب لقائمة مطعم." },
      { id: "social_media_hero", label: "لقطة إعلان/سوشيال", helper: "صورة جذابة قابلة للنشر مباشرة." }
    ]
  },
  {
    id: "scene",
    title: "بيئة الصورة",
    description: "اختر المكان أو الإحساس المحيط بالطبق.",
    options: [
      { id: "kuwaiti_inspired_scene", label: "بيئة مستوحاة من الكويت", helper: "خامات وسياق كويتي راقٍ حول الطبق." },
      { id: "heritage_table", label: "طاولة تراثية راقية", helper: "سدو ناعم، دلة بعيدة، بخور خفيف." },
      { id: "modern_kuwait_cafe", label: "كافيه كويتي حديث", helper: "رخام/خشب وإضاءة نهارية نظيفة." },
      { id: "seaside_sunset", label: "أجواء بحرية هادئة", helper: "غروب وانعكاس خفيف بدون ازدحام." },
      { id: "luxury_dark", label: "فاخر داكن", helper: "إضاءة جانبية وانعكاسات احترافية." }
    ]
  }
];

export const SMART_STUDIO_COPY_FIXES = {
  removeName: "مشهد كويتي",
  replaceWith: "بيئة مستوحاة من الكويت",
  professionalDifference: "تصوير طعام احترافي يتحكم في جودة الصورة؛ البيئة المستوحاة من الكويت تتحكم في المكان والخامات حول الطبق.",
  libraryStatus: "تم دمج المكتبة في خيارات المشهد والأسلوب، وتُستخدم تلقائياً حتى لو لم يكتب المستخدم فكرة."
};
