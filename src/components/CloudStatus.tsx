import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, XCircle } from 'lucide-react';

const CloudStatus: React.FC = () => {
 const [status, setStatus] = useState<'connected' | 'disconnected'>('connected');

 // Simulation: Add real Firebase connection check here if desired
 useEffect(() => {
 // For now, it stays 'connected' as per previous simulation
 setStatus('connected');
 }, []);

 return (
 <div className="flex items-center justify-center p-2" title={status === 'connected' ? 'متصل بالسحابة' : 'غير متصل بالسحابة'}>
 {status === 'connected' ? (
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
) : (
 <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
)}
 </div>
);
};

export default CloudStatus;
