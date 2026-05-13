import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rename App to MainApp
content = content.replace('const App: React.FC = () => {', 'const MainApp: React.FC = () => {');

// 2. Remove old splash state
content = content.replace(
`  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);`, 
  ''
);

// 3. Remove old splash render
const oldSplashStart = content.indexOf('  if (showSplash) {');
const oldSplashEnd = content.indexOf('  if (authLoading) {');

if (oldSplashStart !== -1 && oldSplashEnd !== -1) {
  content = content.slice(0, oldSplashStart) + content.slice(oldSplashEnd);
} else {
  console.log("Could not find old splash block properly");
}

// 4. Add new ZenSplash and wrapper at bottom
const newCode = `
const ZEN_QUOTES = [
  "رؤية واضحة.. التراث في كل تفصيلة",
  "النجاح ليس صدفة، بل هو قرار وتراث",
  "حيث تتضح الرؤية، يولد الإنجاز",
  "كل تفصيل يصنع فارقاً",
  "بوضوح الرؤية، نرتقي",
  "نضيء الدرب بخطى واثقة",
  "الإتقان لغة لا تحتاج إلى ترجمة",
  "نحن لا ننتظر المستقبل، بل نصنعه"
];

const ZenSplash: React.FC<{ show: boolean, logo?: string, name?: string }> = ({ show, logo, name }) => {
  const [quote, setQuote] = useState(ZEN_QUOTES[0]);
  useEffect(() => {
    setQuote(ZEN_QUOTES[Math.floor(Math.random() * ZEN_QUOTES.length)]);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
           initial={{ opacity: 1 }}
           exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
           className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-slate-50"
           dir="rtl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/5 via-slate-50 to-emerald-900/5 flex flex-col items-center justify-center">
             <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] opacity-60 animate-pulse" />
             <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-8 relative"
            >
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[40px] opacity-20 animate-pulse" />
              <LogoEngine src={logo || DEFAULT_GLOBAL_LOGO} variant="royal" className="w-32 h-32 md:w-40 md:h-40 relative z-10 drop-shadow-2xl" />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="text-center"
            >
              <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-l from-slate-900 via-indigo-800 to-emerald-700 bg-clip-text text-transparent mb-4 leading-relaxed tracking-tight">
                {name || 'شركة مطبخ التراث الكويتي'}
              </h1>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.5, delay: 0.8 }}
               className="mt-8 w-56 md:w-72 h-1.5 bg-slate-200/50 rounded-full overflow-hidden relative"
            >
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: '-10%' }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                    className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
            </motion.div>

            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 1 }}
               className="text-center mt-6 px-6"
            >
               <p className="text-slate-500 font-bold text-sm md:text-base italic animate-pulse">
                 "{quote}"
               </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
   const [showSplash, setShowSplash] = useState(true);
   const [logo, setLogo] = useState(DEFAULT_GLOBAL_LOGO);
   const [name, setName] = useState('شركة مطبخ التراث الكويتي');

   useEffect(() => {
     try {
       const raw = localStorage.getItem('ktk_accounting_data');
       if (raw) {
         const parsed = JSON.parse(raw);
         if (parsed?.settings?.companyLogo) setLogo(parsed.settings.companyLogo);
         if (parsed?.settings?.companyName) setName(parsed.settings.companyName);
       }
     } catch(e) {}
     const timer = setTimeout(() => setShowSplash(false), 2500);
     return () => clearTimeout(timer);
   }, []);

   return (
     <>
       <MainApp />
       <ZenSplash show={showSplash} logo={logo} name={name} />
     </>
   );
};

export default App;
`;

content = content.replace('export default App;', newCode);

fs.writeFileSync('src/App.tsx', content);
console.log("Patch completed.");
