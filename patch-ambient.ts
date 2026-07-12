import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const ambientComponent = `const AmbientBackground = () => {
    const [timePhase, setTimePhase] = useState('morning');
    useEffect(() => {
        const updateTime = () => {
            const h = new Date().getHours();
            if (h >= 5 && h < 14) setTimePhase('morning');
            else if (h >= 14 && h < 18) setTimePhase('afternoon');
            else setTimePhase('evening');
        };
        updateTime();
        const t = setInterval(updateTime, 60000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[1] transition-colors duration-[3000ms]">
          {timePhase === 'morning' && <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 to-transparent mix-blend-multiply" />}
          {timePhase === 'afternoon' && <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-orange-50/20 to-transparent mix-blend-multiply" />}
          {timePhase === 'evening' && <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-slate-800/10 to-transparent mix-blend-multiply" />}
        </div>
    );
};

const MainApp: React.FC = () => {`;

content = content.replace('const MainApp: React.FC = () => {', ambientComponent);

content = content.replace(
  '<div className="flex h-[100dvh] w-full overflow-hidden bg-atmospheric text-slate-900 arabic-font" dir="rtl">',
  '<div className="flex h-[100dvh] w-full overflow-hidden bg-atmospheric text-slate-900 arabic-font" dir="rtl">\n      <AmbientBackground />'
);

fs.writeFileSync('src/App.tsx', content);
