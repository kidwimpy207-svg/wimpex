const webpush = require('web-push');
const crypto = require('crypto');
const config = require('../config');
const { state, save } = require('./store');

// Init WebPush — tolerate invalid/malformed VAPID keys
if (config.vapid && config.vapid.publicKey && config.vapid.privateKey) {
    try {
        const emailFrom = (config.smtp && config.smtp.from) ? `mailto:${config.smtp.from}` : 'mailto:admin@example.com';
        webpush.setVapidDetails(
            emailFrom,
            config.vapid.publicKey,
            config.vapid.privateKey
        );
    } catch (e) {
        console.warn('Invalid VAPID keys — push disabled for this run', e && e.message ? e.message : e);
        // Disable vapid in config so other code knows push is unavailable
        config.vapid = null;
    }
} else {
    // Not configured — continue without push support
}

function genId() { return crypto.randomBytes(6).toString('hex'); }

function enqueueNotification(userId, payload) {
    state.notifQueue.push({ id: genId(), userId, payload, ts: Date.now(), sent: false });
    save.notifQueue();
}

async function sendPushToSubscription(sub, payload) {
    try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        return true;
    } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) return false;
        console.error('Push send error', e);
        return true;
    }
}

async function sendPush(userId, payload) {
    const prefs = state.notifPrefs[userId] || { push: true, inApp: true, digest: false, dnd: false };
    if (!prefs.push || prefs.dnd) {
        enqueueNotification(userId, payload);
        return;
    }

    const subs = state.pushSubscriptions[userId] || [];
    if (subs.length) {
        const removed = [];
        await Promise.all(subs.map(async (sub) => {
            const ok = await sendPushToSubscription(sub, payload);
            if (!ok) removed.push(sub.endpoint);
        }));

        if (removed.length) {
            state.pushSubscriptions[userId] = state.pushSubscriptions[userId].filter(s => !removed.includes(s.endpoint));
            if (state.pushSubscriptions[userId].length === 0) delete state.pushSubscriptions[userId];
            save.pushSubscriptions();
        }
    } else {
        // If no subs, maybe queue? Or just ignore.
        // enqueueNotification(userId, payload);
    }
}

module.exports = {
    enqueueNotification,
    sendPush,
    webpush // export for key generation if needed
};
