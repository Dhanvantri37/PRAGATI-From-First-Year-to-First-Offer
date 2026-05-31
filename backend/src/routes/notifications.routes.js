/**
 * notifications.routes.js
 *
 * Handles Web Push subscription storage and sending.
 * Requires: npm install web-push
 * Env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 *
 * Generate keys once: npx web-push generate-vapid-keys
 */

const express = require('express');
const router  = express.Router();
const webpush = require('web-push');
const { authenticate: auth } = require('../middleware/auth.middleware');
const User    = require('../models/User.model');

// Configure VAPID keys (set these in .env)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'pragati@college.edu'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// ── Save push subscription for the logged-in user ────────────────────────────
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    await User.findByIdAndUpdate(req.user._id, {
      $set: { pushSubscription: subscription }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[push subscribe]', err.message);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// ── Remove push subscription (unsubscribe / notifications denied) ─────────────
router.delete('/subscribe', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { pushSubscription: 1 } });
  res.json({ success: true });
});

// ── Internal helper: send push to one user ────────────────────────────────────
// Call this from announcement/drive creation routes:
// const { pushToUser } = require('./notifications.routes');
// await pushToUser(userId, { title, body, url, id, tag });
async function pushToUser(userId, payload) {
  try {
    const user = await User.findById(userId).select('pushSubscription');
    if (!user?.pushSubscription?.endpoint) return;
    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify({ title: 'PRAGATI', ...payload }),
    );
  } catch (err) {
    // 410 Gone = subscription expired → clean up
    if (err.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    }
    // Silently ignore other errors (user may have denied permissions since)
  }
}

// ── Unified helper: emit real-time bell event + optional web push ──────────────
// emitToUser(app, userId, notifPayload, { push: true/false })
// notifPayload: { _id, type, title, message, link, priority, createdAt }
// type: 'announcement' | 'drive' | 'discussion' | 'message'
async function emitToUser(app, userId, notifPayload, { push = false } = {}) {
  try {
    // Real-time socket bell
    const io = app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notifPayload);
    }
    // Web push (outside app)
    if (push) {
      await pushToUser(userId, {
        title: notifPayload.title,
        body: notifPayload.message,
        url: notifPayload.link || '/dashboard',
        id: notifPayload._id?.toString(),
        tag: `${notifPayload.type}-${notifPayload._id?.toString()}`,
      });
    }
  } catch (err) {
    console.error('[emitToUser]', err.message);
  }
}

// ── Send push to ALL students (for announcements / drives) ───────────────────
// POST /api/notifications/broadcast  — admin/faculty only
router.post('/broadcast', auth, async (req, res) => {
  if (!['admin','faculty'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised' });
  }
  const { title, body, url, tag } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    const users = await User.find({ pushSubscription: { $exists: true, $ne: null } }).select('pushSubscription _id');
    const results = await Promise.allSettled(
      users.map(u => webpush.sendNotification(
        u.pushSubscription,
        JSON.stringify({ title, body, url: url || '/dashboard', tag: tag || `notif-${Date.now()}`, id: `${Date.now()}` }),
      ).catch(async err => {
        if (err.statusCode === 410) {
          await User.findByIdAndUpdate(u._id, { $unset: { pushSubscription: 1 } });
        }
      }))
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ success: true, sent, total: users.length });
  } catch (err) {
    console.error('[push broadcast]', err.message);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

module.exports = router;
module.exports.pushToUser = pushToUser;
module.exports.emitToUser = emitToUser;
