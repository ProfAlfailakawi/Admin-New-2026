import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/index.css', 'utf8');

// I will append some custom CSS classes 
if(!content.includes('.interactive-hover')) {
content += `

/* Modern Heritage Custom Classes */
.interactive-hover {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.interactive-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
}

.glass-surface {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
}

.glass-dark {
  background: rgba(15, 23, 42, 0.8) !important; /* slate-900 with opacity */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
}

`;

writeFileSync('src/index.css', content);
}
console.log("Updated css with heritage classes");
