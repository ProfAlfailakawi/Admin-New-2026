import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/FutureForecast.tsx', 'utf8');

// remove CartesianGrid
content = content.replace(/<CartesianGrid[^>]*\/>/g, '');

// replace strokes with radiant ones
// The original might use #6366f1 or similar. We will just ensure Monotone curves are smooth.
// Actually Recharts curves are defined by type="monotone"
content = content.replace(/type="monotone"/g, 'type="monotone" strokeWidth={3} filter="url(#glow)"');
content = content.replace(/fillOpacity=\{0\.1\}/g, 'fillOpacity={0.2}');
content = content.replace(/strokeOpacity=\{0\.5\}/g, 'strokeOpacity={0.0}');


// Add glow filter inside AreaChart or LineChart definition. We'll just define it inside a defs
const defs = `
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
`;
if(!content.includes('<filter id="glow"')) {
    content = content.replace(/<defs>/g, defs + '\n<defs>');
}

writeFileSync('src/components/FutureForecast.tsx', content);
console.log("Updated FutureForecast charts");
