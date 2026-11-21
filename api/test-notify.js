import { setVapidDetails, sendNotification } from 'web-push';
import { Redis } from '@upstash/redis';

let redisClient = null;
function redis() {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

function isCronAuthorized(headers, secret) {
  if (!secret) return false;
  const auth = (headers && headers.authorization) || '';
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!isCronAuthorized(req.headers, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com', publicKey, privateKey);

  const subs = (await redis().get('push:subscriptions')) || [];
  const payload = JSON.stringify({ title: 'JARVIS', body: 'Тестовое уведомление: всё работает ✅', data: { test: true } });
  let sent = 0;
  let failed = 0;
  for (const entry of subs) {
    try {
      await sendNotification(entry.subscription, payload);
      sent += 1;
    } catch (err) {
      failed += 1;
    }
  }
  return res.status(200).json({ sent, failed, total: subs.length });
}
