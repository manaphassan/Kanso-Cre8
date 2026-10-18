const express = require('express');
const router = express.Router();
const GeminiService = require('../services/GeminiService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/ai/status', authenticateToken, (req, res) => {
  try {
    res.json({ success: true, ...GeminiService.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/ai/config', authenticateToken, requirePermission('ai:prompt'), (req, res) => {
  try {
    const { apiKey, model, temperature, systemInstruction } = req.body;
    const updated = GeminiService.saveConfig({ apiKey, model, temperature, systemInstruction });
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/ai/prompt', authenticateToken, requirePermission('ai:prompt'), async (req, res) => {
  try {
    const { promptType, context } = req.body;
    if (!promptType) return res.status(400).json({ error: 'promptType is required' });
    const formatted = GeminiService.formatUltraPrompt(promptType, context || {});
    res.json({ success: true, ...formatted });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/ai/generate', authenticateToken, requirePermission('ai:prompt'), async (req, res) => {
  try {
    const { prompt, promptType, context } = req.body;
    if (!prompt && !promptType) return res.status(400).json({ error: 'Either prompt or promptType is required' });
    const result = await GeminiService.generateText(prompt, { promptType, context });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
