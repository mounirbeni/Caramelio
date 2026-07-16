const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const testKey = '__healthcheck__';
  try {
    const marker = Date.now().toString();
    await redis.set(testKey, marker);
    const readBack = await redis.get(testKey);
    await redis.del(testKey);
    res.status(200).json({ ok: true, redisConnected: true, roundTripMatched: readBack === marker });
  } catch (err) {
    res.status(500).json({ ok: false, redisConnected: false, error: err.message });
  }
};
