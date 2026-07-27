import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
 title: string;
 message: string;
 onConfirm: () => void;
 onCancel: () => void;
 confirmText?: string;
 cancelText?: string;
 variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
 title, 
 message, 
 onConfirm, 
 onCancel, 
 confirmText = 'نعم، تأكيد الحذف', 
 cancelText = 'إلغاء الأمر',
 variant = 'danger'
}) => {
 const getColors = () => {
 if (variant === 'warning') return { bg: 'bg-amber-50', icon: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' };
 if (variant === 'info') return { bg: 'bg-blue-50', icon: 'text-blue-500', btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' };
 return { bg: 'bg-red-50', icon: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/20' };
 };

 const colors = getColors();

 return (
 <AnimatePresence>
 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-3xl md:rounded-3xl w-[95%] max-w-sm shadow-xl p-4 md:p-6 border border-slate-100 text-center flex flex-col max-h-[85vh] overflow-hidden"
 >
 <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
 <div className={cn("w-12 md:w-20 h-12 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner", colors.bg)}>
 <AlertCircle className={colors.icon} size={32} />
 </div>
 <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
 <p className="text-slate-500 font-medium mb-8 leading-relaxed">
 {message}
 </p>
 </div>
 <div className="flex gap-3 pt-6 mt-auto border-t border-slate-50">
 <button 
 onClick={onCancel}
 className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all shadow-sm"
 >
 {cancelText}
 </button>
 <button 
 onClick={onConfirm}
 className={cn("flex-1 py-3 px-4 text-white font-bold rounded-2xl transition-all shadow-lg", colors.btn)}
 >
 {confirmText}
 </button>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
);
};

export default ConfirmModal;
