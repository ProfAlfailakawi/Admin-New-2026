const fs = require('fs');
fs.readdirSync('src/components/').forEach(file => {
  if (file.includes('Customer')) console.log(file);
});
