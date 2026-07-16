const { Redis } = require('@upstash/redis');

const STATUS_KEY = 'booking:status';
const redis = Redis.fromEnv();

async function readStatus() {
  const raw = await redis.get(STATUS_KEY);
  if (!raw) return { disabled: false, reason: '' };
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { disabled: !!parsed.disabled, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const status = await readStatus();
      res.status(200).json(status);
    } catch (err) {
      // Fail open — if the status itself can't be read, don't block customers from reserving.
      res.status(200).json({ disabled: false, reason: '' });
    }
    return;
  }

  if (req.method === 'POST') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      res.status(500).json({ error: 'Server not configured: set ADMIN_PASSWORD in your Vercel project environment variables.' });
      return;
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== adminPassword) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    if (!req.body || typeof req.body !== 'object' || typeof req.body.disabled !== 'boolean') {
      res.status(400).json({ error: '"disabled" must be a boolean' });
      return;
    }
    if (req.body.reason != null && (typeof req.body.reason !== 'string' || req.body.reason.length > 140)) {
      res.status(400).json({ error: 'Reason is too long' });
      return;
    }

    const status = { disabled: req.body.disabled, reason: req.body.reason ? req.body.reason.trim() : '' };

    try {
      await redis.set(STATUS_KEY, JSON.stringify(status));
    } catch (err) {
      res.status(500).json({ error: 'Could not save booking status. Database is not connected yet.' });
      return;
    }

    res.status(200).json({ ok: true, ...status });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
