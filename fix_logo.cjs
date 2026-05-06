const fs = require('fs');
fs.copyFileSync('public/logo.png', 'src/logo.png');
console.log('Copied public/logo.png to src/logo.png');
