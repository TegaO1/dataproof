/**
 * api/index.js
 * 
 * Vercel serverless entry point.
 * One Express app handles every /api/* route.
 * Vercel routes all /api/* requests here via vercel.json rewrites.
 */

import express   from 'express';
import authRoutes    from '../lib/routes/auth.js';
import datasetRoutes from '../lib/routes/datasets.js';
import uploadRoutes  from '../lib/routes/upload.js';
import accessRoutes  from '../lib/routes/access.js';
import proofRoutes   from '../lib/routes/proofs.js';
import statsRoutes   from '../lib/routes/stats.js';

const app = express();

app.use(express.json({ limit: '2mb' }));

// CORS — allow your Vercel domain + localhost dev
app.use((req, res, next) => {
  const allowed = [
    'https://dataproof.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const origin = req.headers.origin;
  if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Api-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'dataproof-api',
  runtime: 'vercel-serverless',
  time: new Date().toISOString(),
}));

// Routes — all mounted under /api/
app.use('/api/auth',     authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/access',   accessRoutes);
app.use('/api/proofs',   proofRoutes);
app.use('/api/stats',    statsRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Export for Vercel — this is the key line
export default app;
