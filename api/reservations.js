const { kv } = require('@vercel/kv');

const LIST_KEY = 'reservations';
const MAX_RETURNED = 200;

function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLen;
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body';
  if (!isNonEmptyString(body.name, 100)) return 'Name is required';
  if (!isNonEmptyString(body.phone, 30)) return 'Phone is required';
  if (!isNonEmptyString(body.date, 20)) return 'Date is required';
  if (!isNonEmptyString(body.time, 20)) return 'Time is required';
  const guests = Number(body.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) return 'Guests must be a number between 1 and 50';
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 500)) return 'Notes are too long';
  return null;
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const error = validate(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: req.body.name.trim(),
      phone: req.body.phone.trim(),
      guests: Number(req.body.guests),
      date: req.body.date.trim(),
      time: req.body.time.trim(),
      notes: req.body.notes ? req.body.notes.trim() : '',
      submittedAt: new Date().toISOString(),
    };

    try {
      await kv.rpush(LIST_KEY, JSON.stringify(record));
    } catch (err) {
      res.status(500).json({ error: 'Could not save reservation. Database is not connected yet.' });
      return;
    }

    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
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

    try {
      const raw = await kv.lrange(LIST_KEY, -MAX_RETURNED, -1);
      const reservations = raw
        .map((item) => {
          try {
            return typeof item === 'string' ? JSON.parse(item) : item;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse();
      res.status(200).json({ reservations });
    } catch (err) {
      res.status(500).json({ error: 'Could not load reservations. Database is not connected yet.' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
};
