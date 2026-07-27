import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const regex = /\{\/\* آلة الزمن المالي \(Financial Time Machine\) \*\/\}[\s\S]*?<input/m;

const replacement = `{/* آلة الزمن المالي (Minimalist) */}
        <div className="fixed bottom-0 md:bottom-3 left-0 right-0 md:left-auto md:right-1/2 md:translate-x-1/2 z-[90] p-4 flex justify-center pointer-events-none fade-in animate-in slide-in-from-bottom-10 duration-700 delay-500">
          <div className="bg-white/80 backdrop-blur-3xl rounded-[2rem] md:rounded-full py-2.5 px-6 flex flex-col items-center gap-1 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.05)] pointer-events-auto w-full max-w-[400px] border border-slate-100 ring-1 ring-slate-900/5 transition-all hover:bg-white/90">
            <input`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  writeFileSync('src/components/Dashboard.tsx', content);
  console.log("Successfully replaced with minimalist UI.");
} else {
  console.log("Could not find the UI block");
}
