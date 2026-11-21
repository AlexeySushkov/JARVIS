import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = req.body || {};
  const { subscription, offsetMinutes } = body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'subscription required' });
  }
  const subs = (await kv.get('push:subscriptions')) || [];
  const entry = { subscription, offsetMinutes: offsetMinutes || 0 };
  const idx = subs.findIndex((s) => s.subscription && s.subscription.endpoint === subscription.endpoint);
  if (idx >= 0) subs[idx] = entry;
  else subs.push(entry);
  await kv.set('push:subscriptions', subs);
  return res.status(200).json({ ok: true });
}
