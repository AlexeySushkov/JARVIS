import { setVapidDetails, sendNotification } from 'web-push';
import { kv } from '@vercel/kv';
import { dueReminders } from '../lib/schedule.js';
import { SLOTS } from '../lib/slots.js';

function hourLabel(hhmm) { return String(parseInt(hhmm.split(':')[0], 10)); }

export function buildPushPayload(reminder) {
  const { slotId, targetDayKey } = reminder;
  if (slotId === 'mood') {
    return { title: 'JARVIS', body: 'Оцени настроение дня 0–10', data: { slotId, targetDayKey } };
  }
  const slot = SLOTS.find((s) => s.id === slotId);
  const body = slot ? `Что делала с ${hourLabel(slot.start)} до ${hourLabel(slot.end)}?` : 'Заполни слот дня';
  return { title: 'JARVIS', body, data: { slotId, targetDayKey } };
}

export default async function handler(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com';
  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  setVapidDetails(subject, publicKey, privateKey);

  const subs = (await kv.get('push:subscriptions')) || [];
  const nowUtc = Date.now();
  const sent = [];
  let skipped = 0;
  for (const entry of subs) {
    const due = dueReminders(nowUtc, entry.offsetMinutes || 0);
    if (due.length === 0) { skipped += 1; continue; }
    for (const reminder of due) {
      try {
        await sendNotification(entry.subscription, JSON.stringify(buildPushPayload(reminder)));
        sent.push({ slotId: reminder.slotId, targetDayKey: reminder.targetDayKey });
      } catch (err) {
        skipped += 1;
      }
    }
  }
  return res.status(200).json({ sent, skipped });
}
