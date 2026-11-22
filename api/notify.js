import { setVapidDetails, sendNotification } from 'web-push';
import { Redis } from '@upstash/redis';
import { localDayKeyFromUtc } from '../lib/dates.js';

let redisClient = null;
function redis() {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

export function buildPushPayload(targetDayKey) {
  return {
    title: 'JARVIS',
    body: 'Как прошёл день? Заполни дневник.',
    data: { slotId: 'mood', targetDayKey },
  };
}

export function isCronAuthorized(headers, secret) {
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
  const subject = process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com';
  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  setVapidDetails(subject, publicKey, privateKey);

  const subs = (await redis().get('push:subscriptions')) || [];
  const nowUtc = Date.now();
  const sent = [];
  let failed = 0;
  for (const entry of subs) {
    const targetDayKey = localDayKeyFromUtc(nowUtc, entry.offsetMinutes || 0);
    try {
      await sendNotification(entry.subscription, JSON.stringify(buildPushPayload(targetDayKey)));
      sent.push({ targetDayKey });
    } catch (err) {
      failed += 1;
    }
  }
  return res.status(200).json({ sent, failed });
}
