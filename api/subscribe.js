import { Redis } from '@upstash/redis';

let redisClient = null;
function redis() {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

export function addSubscription(list, entry, max) {
  const next = list.filter((s) => !(s.subscription && s.subscription.endpoint === entry.subscription.endpoint));
  next.push(entry);
  return next.slice(-max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = req.body || {};
  const { subscription, offsetMinutes } = body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'subscription required' });
  }
  const entry = { subscription, offsetMinutes: offsetMinutes || 0 };
  const subs = addSubscription((await redis().get('push:subscriptions')) || [], entry, 10);
  await redis().set('push:subscriptions', subs);
  return res.status(200).json({ ok: true });
}
