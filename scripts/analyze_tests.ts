import fs from 'fs';

const serverTs = fs.readFileSync('server.ts', 'utf8');

if (serverTs.includes('app.use(cors())') && !serverTs.includes('cors({')) {
  console.log('WARNING: CORS is configured to allow all origins.');
} else {
  console.log('CORS looks configured.');
}

if (!serverTs.includes('app.use(helmet(')) {
  console.log('WARNING: Helmet is not used for security headers.');
} else {
  console.log('Helmet is used.');
}

if (!serverTs.includes('express-rate-limit')) {
  console.log('WARNING: Rate limiting is not configured.');
} else {
  console.log('Rate limiting is configured.');
}
