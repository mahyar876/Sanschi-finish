const express = require('express');
const rateLimit = require('express-rate-limit');
const { recommendFromMessage } = require('../services/bookingAssistant');
const { handleAssistantChat } = require('../services/assistantConversation');
const { sanitizeUserMessage } = require('../lib/assistantValidate');
const { optionalAuth } = require('../middleware/authController');

const router = express.Router();
router.use(optionalAuth);

const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_ASSISTANT_MAX || '30', 10) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'درخواست‌های زیاد؛ چند دقیقه بعد دوباره تلاش کنید',
  },
});

/** POST /api/assistant/chat — مکالمه چندمرحله‌ای */
router.post('/chat', assistantLimiter, async (req, res) => {
  try {
    const message = sanitizeUserMessage(req.body?.message);
    const sessionId = String(req.body?.sessionId || '').trim() || undefined;
    const limit = req.body?.limit;
    const userId = req.user?._id ? String(req.user._id) : undefined;

    const out = await handleAssistantChat({ message, sessionId, limit, userId });
    if (!out.ok) {
      return res.status(out.code || 400).json({
        success: false,
        message: out.message,
      });
    }
    res.json({
      success: true,
      sessionId: out.sessionId,
      reply: out.reply,
      summary: out.summary,
      intent: out.intent,
      results: out.results,
      needsInput: out.needsInput,
      engine: out.engine,
    });
  } catch (err) {
    console.error('assistant/chat error:', err.message);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

/** POST /api/assistant/recommend — body: { message: string } */
router.post('/recommend', assistantLimiter, async (req, res) => {
  try {
    const message = sanitizeUserMessage(req.body?.message);
    const out = await recommendFromMessage({ message, limit: req.body?.limit });
    if (!out.ok) {
      return res.status(out.code || 400).json({
        success: false,
        message: out.message,
      });
    }
    res.json({
      success: true,
      summary: out.summary,
      intent: out.intent,
      results: out.results,
      needsInput: out.needsInput,
      engine: out.engine,
    });
  } catch (err) {
    console.error('assistant/recommend error:', err.message);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
