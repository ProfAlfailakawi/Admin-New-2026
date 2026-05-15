import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

// p-10 md:p-14 to p-6 md:p-14
content = content.replace(/p-10 md:p-14/g, 'p-6 md:p-14');

// p-8 shadow-2xl etc
content = content.replace(/p-8/g, 'p-6 md:p-8');
content = content.replace(/p-6 md:p-6 md:p-8/g, 'p-6 md:p-8'); // fix duplicate

// p-8 sm:p-12 lg:p-24
content = content.replace(/p-6 md:p-8 sm:p-12 lg:p-24/g, 'p-6 md:p-12 lg:p-24'); // handled gracefully

// rounded-[3rem] p-10 -> p-6 md:p-10
content = content.replace(/rounded-\[3rem\] p-10/g, 'rounded-[3rem] p-6 md:p-10');

// rounded-[4rem] to rounded-3xl sm:rounded-[4rem]
content = content.replace(/sm:rounded-\[4rem\]/g, 'rounded-3xl sm:rounded-[4rem]');

// p-4 sm:p-6 lg:p-6 md:p-8 
content = content.replace(/p-4 sm:p-6 lg:p-6 md:p-8/g, 'p-4 sm:p-6 lg:p-8');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated Dashboard Paddings");
