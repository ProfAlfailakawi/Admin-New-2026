export type PaymentMethod = 'KNet' | 'Link' | 'BankTransfer' | 'Cash';

export interface DetailedAddress {
  region?: string;
  block: string;
  street: string;
  jaddah?: string;
  building: string;
  floor?: string;
  apartment?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'active' | 'slow' | 'inactive';
  lastOrderDate?: string;
  lastActive?: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  area?: string; // For Geospatial Forecasting
  address?: string | DetailedAddress; // Address can be simple string or structured
  diwaniyaName?: string;
  diwaniyaPoints?: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  paymentMethods: PaymentMethod[];
  balance: number;
  status: 'paid' | 'pending' | 'partially_paid';
}

export interface SupplierTransfer {
  id: string;
  supplierId: string;
  amount: number;
  remainingAmount: number;
  method: PaymentMethod;
  date: string;
  notes?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  cost: number;
  calculationType: 'per_item' | 'per_x_items' | 'fixed';
  xItemsThreshold?: number;
  isHiddenPrice: boolean;
  isRequired?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  freeQuantity?: number;
  trackStock?: boolean;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  category: string;
  supplierId: string;
  createdAt?: string;
  lastSaleDate?: string;
  matrixCategory?: 'star' | 'puzzle' | 'horse' | 'dog';
  imageUrl?: string;
  isActive?: boolean;
  isOutOfStock?: boolean;
  description?: string;
  calories?: number;
  stock?: number;
  preparationInstructions?: string;
  addons?: ProductAddon[];
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  regionId: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: string;
  date: string;
  notes?: string;
  deliveryType?: DeliveryType;
  address?: any;
  updatedAt?: string;
  isConvertedToInvoice?: boolean;
  linkedInvoiceId?: string;
  paymentStatus?: any;
}

export interface SelectedAddon {
  addonId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  isHiddenPrice: boolean;
}

export interface InvoiceItem {
  productId: string;
  quantity: number;
  priceAtTime: number;
  costAtTime: number;
  itemNotes?: string;
  addons?: SelectedAddon[];
}

export interface Zone {
  id: string;
  name: string;
  cost: number;
  profit: number;
  finalPrice: number;
  isActive: boolean;
}

export interface DeliveryInfo {
  company: string;
  zoneName: string;
  cost: number;
  profit: number;
  finalPrice: number;
}

export type DeliveryType = 'standard' | 'company' | 'special' | 'free';

export interface Invoice {
  id: string;
  customerId: string;
  address?: any;
  notes?: string;
  items: InvoiceItem[];
  deliveryFee: number;
  deliveryType: DeliveryType;
  deliveryInfo?: DeliveryInfo;
  gatewayFee: number; // The 200 fils fee
  paymentMethod: PaymentMethod;
  date: string;
  totalAmount: number;
  totalCost: number;
  profit: number;
  discount: number;
  isDeleted?: boolean;
  area?: string; // Snapshot of customer area at time of order
  paymentLink?: string; // Upayments payment link
  paymentId?: string; // Upayments internal payment ID
  paymentStatus?: any; // Payment status
  appliedPromoCodeName?: string;
  status?: any;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
}

export interface AppSettings {
  gatewayFeeAmount: number; // e.g., 0.200
  companyLogo?: string;
  companyName: string;
  restaurantNumbers: string[];
  notifications: {
    lateInvoices: boolean;
    salesGoals: boolean;
    newCustomers: boolean;
  };
  storeStatus?: {
    isOpen: boolean;
    manualClose: boolean;
    closeMessage?: string;
    openingHours?: {
      [key: string]: { open: string; close: string; enabled: boolean };
    };
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
  isPopupShown?: boolean;
  insightType?: 'خطر' | 'فرصة' | 'تنبيه';
  explanation?: string;
  dataReference?: string;
  recommendedAction?: string;
}

export interface Testimonial {
  id: string;
  customerName?: string;
  content: string;
  date: string;
  source: 'WhatsApp' | 'Instagram' | 'Direct';
  rating: number; // 1-5
  invoiceId?: string; // Link to specific order for Supplier Bio-feedback
}

export interface BusinessGoal {
  id: string;
  title: string;
  type: 'increase_sales' | 'reduce_costs' | 'increase_profit' | 'improve_retention' | 'revenue' | 'customers';
  category: 'revenue' | 'customers'; // Added for UI compatibility
  targetValue: number;         // Added for UI compatibility
  currentValue: number;        // Added for UI compatibility
  currentProgress: number;     // Added for UI compatibility
  targetPercentage?: number;
  startDate: string;
  deadline: string;
  baselineMetric?: number;
  status: 'active' | 'completed' | 'paused';
}

export interface AILearningEvent {
  id: string;
  predictionDate: string;
  evaluationDate: string;
  context: string;
  predictedOutcome: string;
  actualOutcome?: string;
  isAccurate?: boolean;
  correctionApplied?: string;
  status: 'pending' | 'evaluated';
}

export interface AICampaign {
  id: string;
  topic: string;
  idea: string;
  message: string;
  marketingMessage?: string; // Added for UI compatibility
  targetAudience: string;
  timing: string;
  expectedOutcome: string;
  status: 'draft' | 'launched';
  createdAt: string;
}

export interface RealProfitInsight {
  id: string;
  productId: string;
  productName: string;
  revenue: number;
  rawProfit: number;
  realProfitValue: number;
  hiddenCostsRatio: number;
  explanation: string;
  recommendation: string;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface SimulationResult {
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  currentMonthlyProfit: number;
  projectedMonthlyProfit: number;
  volumeImpact: number; // percentage change in volume
  explanation: string;
  dataStatus?: 'sufficient' | 'insufficient';
}

export interface BusinessHealthScore {
  score: number; // 0-100
  status: 'Healthy' | 'Risk' | 'Critical';
  explanation: string;
  factors: {
    label: string;
    score: number;
    weight: number;
    trend: 'improving' | 'declining' | 'stable';
  }[];
  recommendations: string[];
}

export interface SupplierNegotiationInsight {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  currentCost: number;
  fairPriceEstimate: number;
  pricingTrend: 'increasing' | 'stable' | 'decreasing';
  isUnfairPricing: boolean;
  explanation: string;
  negotiationApproach: string;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface PulseAnalysisRecord {
  id: string;
  date: string;
  summary: string;
  commentsSnapshot: string[]; // Store comments that were analyzed
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface SquadMember {
  name: string;
  phone: string;
  points: number;
}

export interface Squad {
  id: number;
  name: string;
  points: number;
  tier: string;
  members: number;
  king: string;
  kingOrders: number;
  phone: string;
  membersList?: SquadMember[];
}

export interface AppState {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  supplierTransfers: SupplierTransfer[];
  settings: AppSettings;
  notifications: Notification[];
  testimonials: Testimonial[];
  zones: Zone[];
  orders: Order[];
  promocodes?: PromoCode[];
  squads?: Squad[];
  loyaltySettings?: {
    expirationDays: number;
    isDynamicEnabled: boolean;
  };
  activeGoal?: BusinessGoal | null;
  aiLearningMemory?: AILearningEvent[];
  campaigns?: AICampaign[];
  pulseReviews?: any[];
  pulseArchiveAnalysis?: any;
  pulseAnalysisHistory?: PulseAnalysisRecord[];
  deepArchiveAnalysis?: any;
  nameMatchMemory?: Record<string, string>; // Maps user input to successful product names
}
