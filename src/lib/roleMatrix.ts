// Role Matrix
// تعريف مركزي للفلاجز فقط. لا يغيّر تسجيل الدخول ولا الصلاحيات الحالية إلا إذا تم استخدامه صراحة داخل الواجهة.

export type AlturathRole = 'admin' | 'partner' | 'local' | 'employee' | 'kitchen' | 'accountant';

export type RoleFlag =
  | 'canViewFinance'
  | 'canEditProducts'
  | 'canManageOrders'
  | 'canSeePartnerRevenue'
  | 'canUseSmartStudio'
  | 'canExportReports';

export const ROLE_MATRIX: Record<AlturathRole, Record<RoleFlag, boolean>> = {
  admin: {
    canViewFinance: true,
    canEditProducts: true,
    canManageOrders: true,
    canSeePartnerRevenue: true,
    canUseSmartStudio: true,
    canExportReports: true,
  },
  partner: {
    canViewFinance: true,
    canEditProducts: false,
    canManageOrders: true,
    canSeePartnerRevenue: true,
    canUseSmartStudio: true,
    canExportReports: false,
  },
  local: {
    canViewFinance: true,
    canEditProducts: true,
    canManageOrders: true,
    canSeePartnerRevenue: true,
    canUseSmartStudio: true,
    canExportReports: true,
  },
  employee: {
    canViewFinance: false,
    canEditProducts: false,
    canManageOrders: true,
    canSeePartnerRevenue: false,
    canUseSmartStudio: false,
    canExportReports: false,
  },
  kitchen: {
    canViewFinance: false,
    canEditProducts: false,
    canManageOrders: true,
    canSeePartnerRevenue: false,
    canUseSmartStudio: false,
    canExportReports: false,
  },
  accountant: {
    canViewFinance: true,
    canEditProducts: false,
    canManageOrders: true,
    canSeePartnerRevenue: false,
    canUseSmartStudio: false,
    canExportReports: true,
  },
};

export const hasRoleFlag = (role: AlturathRole | null | undefined, flag: RoleFlag) => {
  const effectiveRole: AlturathRole = role || 'employee';
  return Boolean(ROLE_MATRIX[effectiveRole]?.[flag]);
};
