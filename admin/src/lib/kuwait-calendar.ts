import { addDays, isAfter, isBefore, isWithinInterval, startOfMonth, endOfMonth, format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  nameEn: string;
  nameAr: string;
  type: 'holiday' | 'season' | 'business';
  startDate: Date;
  endDate: Date;
  priority: 'high' | 'medium' | 'low';
  suggestedProductsEn: string[];
  suggestedProductsAr: string[];
  opportunityEn: string;
  opportunityAr: string;
}

/**
 * Calculates Kuwaiti and Islamic holidays for a given year.
 * Note: Islamic holidays are approximate as they depend on lunar sightings.
 */
export function getKuwaitEvents(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [
    {
      id: 'national-day-' + year,
      nameEn: 'Kuwait National Day',
      nameAr: 'اليوم الوطني الكويتي',
      type: 'holiday',
      startDate: new Date(year, 1, 25), // Feb 25
      endDate: new Date(year, 1, 25),
      priority: 'high',
      suggestedProductsEn: ['National Themed Meals', 'Family Catering Boxes', 'Traditional Sweets'],
      suggestedProductsAr: ['وجبات بطابع وطني', 'بوكسات ضيافة عائلية', 'حلويات شعبية'],
      opportunityEn: 'Huge demand for group catering and patriotic themed food items.',
      opportunityAr: 'طلب كبير على بضائع التجهيزات الغذائية والوجبات ذات الطابع الوطني والاحتفالات.',
    },
    {
      id: 'liberation-day-' + year,
      nameEn: 'Liberation Day',
      nameAr: 'يوم التحرير',
      type: 'holiday',
      startDate: new Date(year, 1, 26), // Feb 26
      endDate: new Date(year, 1, 26),
      priority: 'high',
      suggestedProductsEn: ['Outdoor BBQ Kits', 'Appetizer Platters', 'Party Boxes'],
      suggestedProductsAr: ['بوكسات شواء خارجية', 'صواني مقبلات', 'بوكسات حفلات'],
      opportunityEn: 'Second day of national celebrations, focus on outdoor family gatherings.',
      opportunityAr: 'اليوم الثاني من الاحتفالات الوطنية، التركيز على التجمعات العائلية والطلبات الخارجية.',
    },
    {
      id: 'summer-peak-' + year,
      nameEn: 'Peak Summer',
      nameAr: 'ذروة الصيف',
      type: 'season',
      startDate: new Date(year, 5, 1), // June 1
      endDate: new Date(year, 7, 31), // Aug 31
      priority: 'medium',
      suggestedProductsEn: ['Cold Beverages', 'Fresh Salads', 'Ice Cream Desserts', 'Iced Coffee'],
      suggestedProductsAr: ['مشروبات باردة', 'سلطات طازجة', 'حلويات آيس كريم', 'قهوة مثلجة'],
      opportunityEn: 'Heat drives demand for refreshing drinks and light meals.',
      opportunityAr: 'الحرارة تزيد الطلب على المشروبات المنعشة والوجبات الخفيفة والباردة.',
    },
    {
      id: 'back-to-school-' + year,
      nameEn: 'Back to School',
      nameAr: 'العودة للمدارس',
      type: 'season',
      startDate: new Date(year, 7, 15), // Aug 15
      endDate: new Date(year, 8, 30), // Sept 30
      priority: 'high',
      suggestedProductsEn: ['Lunch Boxes', 'Healthy Snacks', 'Quick Breakfasts', 'Group Meals'],
      suggestedProductsAr: ['صناديق الغداء (Lunch Boxes)', 'سناك صحي', 'إفطار سريع', 'وجبات مجموعات'],
      opportunityEn: 'Major season for families looking for convenient school meal solutions.',
      opportunityAr: 'موسم رئيسي للعائلات التي تبحث عن اشتراكات غداء أو وجبات مدرسية جاهزة.',
    },
    {
      id: 'camping-season-' + year,
      nameEn: 'Winter & Camping',
      nameAr: 'موسم التخييم والكشتات',
      type: 'season',
      startDate: new Date(year, 10, 1), // Nov 1
      endDate: new Date(year + 1, 1, 28), // Feb 28 next year
      priority: 'high',
      suggestedProductsEn: ['Ready-to-Grill Meats', 'Hot Beverages', 'Fatayer & Muajjanat', 'Full Catering'],
      suggestedProductsAr: ['لحوم جاهزة للشواء', 'مشروبات ساخنة', 'فطائر ومعجنات', 'تجهيزات غذائية كاملة'],
      opportunityEn: 'Outdoor camping is the biggest cultural activity during winter.',
      opportunityAr: 'التخييم والكشتات هي أكبر نشاط في الشتاء، استهدف بوكسات الجمعات والطلبات الخارجية للبر.',
    }
  ];

  // Islamic Holidays (Approximate for 2026)
  if (year === 2026) {
    events.push(
      {
        id: 'ramadan-2026',
        nameEn: 'Ramadan',
        nameAr: 'شهر رمضان المبارك',
        type: 'holiday',
        startDate: new Date(2026, 1, 18), // Feb 18
        endDate: new Date(2026, 2, 19),   // March 19
        priority: 'high',
        suggestedProductsEn: ['Iftar Meal Boxes', 'Mini Fatayer Platters', 'Ramadan Juice Mixes', 'Suhoor Bundles'],
        suggestedProductsAr: ['بوكسات إفطار صائم', 'درزن معجنات مشكلة', 'عصائر رمضانية', 'وجبات سحور'],
        opportunityEn: 'Massive surge in catering for Iftar and late-night Suhoor/Ghabga gatherings.',
        opportunityAr: 'زيادة هائلة في طلبات الإفطار والغبقات الرمضانية. ركز على البوكسات العائلية الجاهزة.',
      },
      {
        id: 'eid-al-fitr-2026',
        nameEn: 'Eid al-Fitr',
        nameAr: 'عيد الفطر',
        type: 'holiday',
        startDate: new Date(2026, 2, 20), // March 20
        endDate: new Date(2026, 2, 23),
        priority: 'high',
        suggestedProductsEn: ['Eid Breakfast Platters', 'Dessert Collections', 'Coffee Service', 'Gift Boxes'],
        suggestedProductsAr: ['صواني ريوق العيد', 'تشكيلة حلويات', 'خدمة الضيافة', 'بوكسات هدايا'],
        opportunityEn: 'Peak demand for family breakfast catering and high-end dessert boxes.',
        opportunityAr: 'ذروة الطلب على ريوق العيد وتجهيزات الحلويات الفاخرة للضيوف.',
      },
      {
        id: 'eid-al-adha-2026',
        nameEn: 'Eid al-Adha',
        nameAr: 'عيد الأضحى',
        type: 'holiday',
        startDate: new Date(2026, 4, 27), // May 27
        endDate: new Date(2026, 4, 30),
        priority: 'high',
        suggestedProductsEn: ['Machboos Platters', 'Large Lamb Feasts', 'Side Dish Buckets'],
        suggestedProductsAr: ['صواني مجبوس عائلية', 'قوزي/ذبائح كاملة', 'أطباق جانبية عائلية'],
        opportunityEn: 'Focus on traditional feasts, meat-heavy main courses, and large family catering.',
        opportunityAr: 'التركيز على الولائم التقليدية، مجبوس اللحم، والطلبات الكبيرة للعائلات.',
      }
    );
  }

  return events;
}

export function getCurrentAndUpcomingEvents(now: Date = new Date()): {
  current: CalendarEvent[];
  upcoming: CalendarEvent[];
  past: CalendarEvent[];
} {
  const year = now.getFullYear();
  const allEvents = [
    ...getKuwaitEvents(year - 1),
    ...getKuwaitEvents(year),
    ...getKuwaitEvents(year + 1),
  ];

  const current: CalendarEvent[] = [];
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];

  allEvents.forEach(event => {
    // Standardize dates to ignore time for range comparison
    const start = new Date(event.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    
    if (isWithinInterval(now, { start, end })) {
      current.push(event);
    } else if (isAfter(start, now)) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  });

  // Sort upcoming by start date
  upcoming.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  // Sort past by most recent first
  past.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  return { current, upcoming, past };
}

export function getSeasonalInsight(now: Date = new Date()): { title: string; detail: string; products: string[] } {
  const { current, upcoming } = getCurrentAndUpcomingEvents(now);
  
  if (current.length > 0) {
    const mainEvent = current.sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))[0];
    return {
      title: `موسم ${mainEvent.nameAr}`,
      detail: mainEvent.opportunityAr,
      products: mainEvent.suggestedProductsAr
    };
  }

  if (upcoming.length > 0) {
    const nextEvent = upcoming[0];
    return {
      title: `الاستعداد لـ ${nextEvent.nameAr}`,
      detail: `يقترب ${nextEvent.nameAr}. ${nextEvent.opportunityAr}`,
      products: nextEvent.suggestedProductsAr
    };
  }

  return {
    title: 'تخطيط الموسم القادم',
    detail: 'ابق على اطلاع دائم بتقلبات السوق الموسمية في الكويت.',
    products: ['تحليل البيانات', 'تجهيز المخزون']
  };
}
