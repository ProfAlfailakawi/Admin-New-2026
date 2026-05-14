const fs = require('fs');
const path = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Convert all grids to simple Flex Col.
content = content.replace(/grid grid-cols-[a-z0-9\-\:\s]+/g, 'flex flex-col w-full ');
content = content.replace(/grid grid flex-col md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3/g, 'flex flex-col w-full');

// 2. Remove any sm:flex-row, md:flex-row, lg:flex-row that causes side placement
content = content.replace(/sm:flex-row/g, 'flex-col');
content = content.replace(/md:flex-row/g, 'flex-col');
content = content.replace(/lg:flex-row/g, 'flex-col');
content = content.replace(/xl:flex-row/g, 'flex-col');

// 3. Any lg:w-1/2, md:w-1/2, w-1/2 should be full width
content = content.replace(/lg:w-1\/2/g, 'w-full');
content = content.replace(/md:w-1\/2/g, 'w-full');
content = content.replace(/lg:w-2\/3/g, 'w-full');
content = content.replace(/md:w-2\/3/g, 'w-full');
content = content.replace(/sm:w-auto/g, 'w-full'); // for some flex children
content = content.replace(/md:w-auto/g, 'w-full'); // for some flex children

// 4. Any flex-1 that might cause side by side stretching in a row? 
// No, flex-row-reverse is still there, but since we are replacing sm:flex-row etc. with flex-col,
// it might break some inner icons. Wait, inner items like Title flex-row-reverse are fine since they don't have sm:flex-row.

// Fix that specific BIEngineCore block:
content = content.replace(/max-w-3xl bg-white\/5/g, 'w-full max-w-none bg-white/5');

// Save the file
fs.writeFileSync(path, content, 'utf8');
