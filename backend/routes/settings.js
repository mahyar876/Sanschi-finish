const express = require('express');
const router = express.Router();
const { getSiteSettings } = require('../services/siteSettings');
const { getOrLoad } = require('../lib/shortCache');

const SITE_SETTINGS_CACHE_MS =
  parseInt(process.env.SITE_SETTINGS_CACHE_MS || '60000', 10) || 60000;

/** تنظیمات عمومی سایت — بدون احراز هویت */
router.get('/site', async (req, res) => {
  try {
    const payload = await getOrLoad('settings:site:public', SITE_SETTINGS_CACHE_MS, async () => {
      const settings = await getSiteSettings({ activePlacementsOnly: true });
      return { success: true, ...settings };
    });
    res.json(payload);
  } catch (err) {
    console.error('GET /settings/site error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

module.exports = router;
