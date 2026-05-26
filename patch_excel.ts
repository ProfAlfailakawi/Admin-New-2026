import fs from 'fs';
let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

let startIndex = content.indexOf(' if (workbook.SheetNames.includes("FullState")) {');
let endIndex = content.indexOf(' }', content.indexOf('return;', startIndex)) + 2;

if(startIndex > -1 && endIndex > -1) {
  const new1 = ` let baseState: any = {};
 if (workbook.SheetNames.includes("FullState")) {
    const fullStateRows = safeSheetToObj("FullState") as any[];
    const joinedJson = fullStateRows
      .sort((a: any, b: any) => Number(a.part || 0) - Number(b.part || 0))
      .map((row: any) => String(row.chunk || ''))
      .join('');
    if (joinedJson.trim()) {
      baseState = JSON.parse(joinedJson);
    }
  }`;
  content = content.substring(0, startIndex) + new1 + content.substring(endIndex);
  console.log("Replaced part 1");
} else {
  console.log("Could not find part 1");
}

let start2 = content.indexOf(' const newState: AppState = {');
let end2 = content.indexOf(' };', start2) + 3;
if (end2 < start2 + 50) { // Just in case "};" has spaces
  end2 = content.indexOf('};', start2) + 2;
}

if (start2 > -1 && end2 > -1) {
    const new2 = ` const newState: AppState = {
  ...INITIAL_DATA,
  ...baseState,
  products: workbook.SheetNames.includes("Products") ? (safeSheetToObj("Products") as any[]).map(restoreProductRow) as any as Product[] : (baseState.products || data.products || INITIAL_DATA.products),
  customers: workbook.SheetNames.includes("Customers") ? (safeSheetToObj("Customers") as any[]).map(restoreCustomerRow) as any as Customer[] : (baseState.customers || data.customers || INITIAL_DATA.customers),
  invoices: baseState.invoices || data.invoices || INITIAL_DATA.invoices, 
  orders: baseState.orders || data.orders || INITIAL_DATA.orders, 
  zones: baseState.zones || data.zones || INITIAL_DATA.zones,
  supplierTransfers: baseState.supplierTransfers || data.supplierTransfers || INITIAL_DATA.supplierTransfers,
  expenses: workbook.SheetNames.includes("Expenses") ? stripUndefined(safeSheetToObj("Expenses")) as any as Expense[] : (baseState.expenses || []),
  suppliers: workbook.SheetNames.includes("Suppliers") ? stripUndefined(safeSheetToObj("Suppliers")) as any as Supplier[] : (baseState.suppliers || []),
  testimonials: workbook.SheetNames.includes("Testimonials") ? stripUndefined(safeSheetToObj("Testimonials")) as any as Testimonial[] : (baseState.testimonials || []),
  pulseAnalysisHistory: workbook.SheetNames.includes("PulseHistory") ? stripUndefined(safeSheetToObj("PulseHistory")) as any as PulseAnalysisRecord[] : (baseState.pulseAnalysisHistory || []),
  pulseReviews: workbook.SheetNames.includes("QuickPulse") ? stripUndefined(safeSheetToObj("QuickPulse")) as any as any[] : (baseState.pulseReviews || []),
  campaigns: workbook.SheetNames.includes("AICampaigns") ? stripUndefined(safeSheetToObj("AICampaigns")) as any as AICampaign[] : (baseState.campaigns || []),
  promocodes: workbook.SheetNames.includes("PromoCodes") ? stripUndefined(safeSheetToObj("PromoCodes")) as any : (baseState.promocodes || []),
  squads: workbook.SheetNames.includes("Diwaniyas") ? stripUndefined(safeSheetToObj("Diwaniyas")) as any : (baseState.squads || []),
  squadTiers: workbook.SheetNames.includes("SquadTiers") ? stripUndefined(safeSheetToObj("SquadTiers")) as any : (baseState.squadTiers || []),
  diwaniyaTiers: workbook.SheetNames.includes("DiwaniyaTiers") ? stripUndefined(safeSheetToObj("DiwaniyaTiers")) as any : (baseState.diwaniyaTiers || []),
  aiLearningMemory: workbook.SheetNames.includes("AILearningMemory") ? stripUndefined(safeSheetToObj("AILearningMemory")) as any : (baseState.aiLearningMemory || []),
  notifications: workbook.SheetNames.includes("Notifications") ? stripUndefined(safeSheetToObj("Notifications")) as any : (baseState.notifications || []),
  loyaltySettings: workbook.SheetNames.includes("LoyaltySettings") ? (safeSheetToObj("LoyaltySettings") as any[])[0] as any || baseState.loyaltySettings || (INITIAL_DATA as any).loyaltySettings : (baseState.loyaltySettings || (INITIAL_DATA as any).loyaltySettings),
  activeGoal: workbook.SheetNames.includes("ActiveGoal") ? (safeSheetToObj("ActiveGoal") as any[])[0] as any || baseState.activeGoal : baseState.activeGoal,
  pulseArchiveAnalysis: workbook.SheetNames.includes("PulseArchiveAnalysis") ? parseChunkedSheet("PulseArchiveAnalysis", false) : baseState.pulseArchiveAnalysis,
  deepArchiveAnalysis: workbook.SheetNames.includes("DeepArchiveAnalysis") ? parseChunkedSheet("DeepArchiveAnalysis", false) : baseState.deepArchiveAnalysis,
  nameMatchMemory: workbook.SheetNames.includes("NameMatchMemory") ? parseChunkedSheet("NameMatchMemory", false) || {} : (baseState.nameMatchMemory || {}),
  settings: workbook.SheetNames.includes("Settings") ? (safeSheetToObj("Settings") as any[])[0] as any || baseState.settings || data.settings || INITIAL_DATA.settings : baseState.settings
  };`;
  content = content.substring(0, start2) + new2 + content.substring(end2);
  console.log("Replaced part 2");
} else {
    console.log("Could not find part 2");
}

fs.writeFileSync('src/components/GeneralSettings.tsx', content);
