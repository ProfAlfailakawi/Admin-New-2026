import React from 'react';
import {
  LayoutDashboard, Sparkles, FilePlus2, FileText, ClipboardList, Users, Package, Wallet,
  Truck, ScrollText, BarChart3, Bot, Wand2, Crown, Ticket, TrendingUp, ShieldCheck,
  Trophy, MessageCircle, Settings, Store,
} from 'lucide-react';

/**
 * Presentation only: a calm icon tile for the admin page hero.
 * Purely decorative (aria-hidden) - the page title next to it stays the accessible name.
 */
const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>> = {
  dashboard: LayoutDashboard,
  'dashboard-ai': Sparkles,
  'new-invoice': FilePlus2,
  'invoices-list': FileText,
  orders: ClipboardList,
  customers: Users,
  products: Package,
  expenses: Wallet,
  suppliers: Truck,
  'suppliers-audit': ScrollText,
  reports: BarChart3,
  ai: Bot,
  'smart-studio': Wand2,
  loyalty: Crown,
  coupons: Ticket,
  'growth-simulator': TrendingUp,
  'profit-guard': ShieldCheck,
  diwaniya: Trophy,
  'whatsapp-support': MessageCircle,
  settings: Settings,
};

export const PageHeroIcon: React.FC<{ page: string }> = ({ page }) => {
  const Icon = ICONS[page] || Store;
  return (
    <span className="admin-page-icon" aria-hidden="true">
      <Icon size={22} strokeWidth={1.6} aria-hidden={true} />
    </span>
  );
};

export default PageHeroIcon;
