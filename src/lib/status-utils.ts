export const isPaidStatus = (s: string | undefined | null) => {
  if (!s) return false;
  const str = String(s).toLowerCase().replace(/_/g, ' ').trim();
  return ['paid', 'processed', 'shipped', 'delivered', 'out for delivery', 'completed', 'done', 'success', 'successful', 'captured', 'approved', 'authorized', 'مكتمل', 'تم الدفع', 'تم الدفع وجاري التوصيل', 'مدفوعة', 'مدفوع'].includes(str);
};

export const isPendingStatus = (s: string | undefined | null) => {
  if (!s) return true; // Default to pending if no status
  const str = String(s).toLowerCase().replace(/_/g, ' ').trim();
  return ['pending', 'new', 'جديد', 'awaiting payment', 'processing', 'بانتظار الدفع', 'انتظار'].includes(str);
};

export const isFailedStatus = (s: string | undefined | null) => {
  if (!s) return false;
  const str = String(s).toLowerCase().replace(/_/g, ' ').trim();
  return ['failed', 'declined', 'rejected', 'expired', 'voided', 'فشل', 'فشلت', 'فشل في عملية الدفع', 'فشلت عملية الدفع', 'cancelled by customer'].includes(str);
};

export const isCancelledStatus = (s: string | undefined | null) => {
  if (!s) return false;
  const str = String(s).toLowerCase().replace(/_/g, ' ').trim();
  return ['cancelled', 'canceled', 'ملغي', 'تم الإلغاء', 'cancel'].includes(str);
};
