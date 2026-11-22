import { setVapidDetails, sendNotification } from 'web-push';
import { Redis } from '@upstash/redis';
import { localDayKeyFromUtc } from '../lib/dates.js';

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
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com', publicKey, privateKey);

  const payload = JSON.stringify({ title: 'JARVIS', body: 'Тестовое уведомление: всё работает ✅', data: { test: true } });

  // 1) Кнопка в приложении: POST { subscription } — шлём только на это устройство.
  if (req.method === 'POST') {
    const sub = req.body && req.body.subscription;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ error: 'subscription required' });
    }
    try {
      await sendNotification(sub, payload);
      return res.status(200).json({ sent: 1, failed: 0 });
    } catch (err) {
      return res.status(200).json({ sent: 0, failed: 1 });
    }
  }

  // 2) Ручная проверка по curl: GET с Authorization — шлём на все подписки.
  if (!isCronAuthorized(req.headers, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const subs = (await redis().get('push:subscriptions')) || [];
  const nowUtc = Date.now();
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
  return res.status(200).json({ sent, failed, total: subs.length, day: localDayKeyFromUtc(nowUtc, 180) });
}
