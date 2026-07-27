import React from 'react';
import { cn } from '../../lib/utils';

// We accept strings, but cast and manage internally
interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
 onChange: (value: string | number) => void;
 value: string | number;
}

export const NumericInput: React.FC<NumericInputProps> = ({ 
 onChange, 
 value, 
 className,
 ...props 
}) => {
 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 let rawValue = e.target.value;
 
 // 1. Normalize Arabic numerals perfectly
 const normalized = rawValue.replace(/[٠-٩]/g, (char) => {
 const ar = '٠١٢٣٤٥٦٧٨٩';
 return String(ar.indexOf(char));
 });
 
 // 2. Remove non-numeric chars except dot
 const sanitized = normalized.replace(/[^0-9.]/g, ''); 
 
 // 3. Prevent multiple dots
 const parts = sanitized.split('.');
 const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;

 // FORCE SYNC DOM instantly to destroy Arabic/invalid chars immediately
 if (e.target.value !== finalValue) {
 e.target.value = finalValue;
 }

 // Call onChange with string so parent can hold"0","0.","0.5" etc. accurately 
 // without React stripping them during state conversion to number
 onChange(finalValue);
 };

 const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
 // Clean trailing dots on blur
 let current = value?.toString() || '';
 if (current.endsWith('.')) {
 onChange(current.slice(0, -1));
 }
 if (props.onBlur) {
 props.onBlur(e);
 }
 };

 return (
 <input
 {...props}
 type="text"
 inputMode="decimal"
 value={value === 0 ? '' : value}
 onChange={handleChange}
 onBlur={handleBlur}
 className={cn("w-full bg-transparent outline-none", className)}
 />
);
};
