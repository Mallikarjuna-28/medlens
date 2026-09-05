import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/index.js';
import patientsRouter from './routes/patients.js';
import reportsRouter from './routes/reports.js';
import summaryRouter from './routes/summary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Initialize database
initializeDatabase();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS — same-origin in production
const isDev = process.env.NODE_ENV !== 'production';
app.use(
  cors({
    origin: isDev ? ['http://localhost:5173', 'http://localhost:3001'] : false,
    credentials: false,
  })
);

// Body parsing + compression
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting on sensitive routes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many upload requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const summaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many summary requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// API routes
app.use('/api', apiLimiter);
app.use('/api/patients', patientsRouter);
app.use('/api/patients/:patientId/reports', uploadLimiter, reportsRouter);
app.use('/api/patients/:patientId', summaryLimiter, summaryRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend when built client assets exist
const clientDistPath = path.join(__dirname, '../client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: Error & { code?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    return;
  }

  if (err.message?.includes('Invalid file type')) {
    res.status(415).json({ error: err.message });
    return;
  }

  const status = err.status ?? 500;
  const message = isDev ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.info(`MedLens server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  });
}

export { app };
