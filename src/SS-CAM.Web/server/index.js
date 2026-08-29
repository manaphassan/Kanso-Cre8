const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');

const compression = require('compression');

const app = express();

// High-performance gzip/deflate response compression
app.use(compression({
  threshold: 1024, // Compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return false; // Never compress SSE stream
    }
    return compression.filter(req, res);
  }
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes (mounted at /api)
app.use('/api', apiRoutes);

// Static client assets (Prioritize Vite production build dist)
const fs = require('fs');
const candidates = [
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, '../../src/SS-CAM.Web/client/dist'),
  path.resolve(__dirname, '../src/SS-CAM.Web/client/dist'),
  path.resolve(__dirname, './src/SS-CAM.Web/client/dist'),
  path.resolve(__dirname, './client/dist'),
  path.resolve(__dirname, '../client')
];
const clientPath = candidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.resolve(__dirname, '../client');
console.log(`[Static] Serving client assets from: ${clientPath}`);

app.use(express.static(clientPath, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    // HTML must NEVER be cached so users always receive latest code
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      // Hashed assets from Vite can be cached permanently
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(config.PORT, config.HOST, () => {
  console.log('================================================================');
  console.log(`🚀 SuamiSihat Creative Team Management Web Portal`);
  console.log(`🌐 Server running at: http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}`);
  console.log(`📂 Workspace Root:   ${config.WORKSPACE_ROOT}`);
  console.log(`🔒 Environment:      Production Ready`);
  console.log('================================================================');
});
