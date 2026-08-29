import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('import helmet from')) {
    content = content.replace('import cors from \'cors\';', 'import cors from \'cors\';\nimport helmet from \'helmet\';\nimport rateLimit from \'express-rate-limit\';');
}

if (content.includes('app.use(cors());')) {
    const replacement = `
  // Production CORS and Security Headers
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || 'https://admin.alturath.app', 'http://localhost:3000', 'http://localhost:8080']
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-wa-admin-auth', 'x-alerts-secret']
  }));

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);
`;
    content = content.replace('app.use(cors());', replacement);
}

fs.writeFileSync('server.ts', content);
