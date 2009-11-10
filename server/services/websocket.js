const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { state, save } = require('./store');

// Active connections: userId -> ws
const connections = new Map();

// Helper to update presence
function markOnline(userId) {
    // We could implement presence tracking here
}
function markOffline(userId) {
    // We could implement presence tracking here
}

function handleConnection(ws) {
    let userId = null;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        const { type } = msg;

        if (type === 'auth') {
            const token = msg.token;
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                userId = decoded.userId;
                connections.set(userId, ws);
                ws.send(JSON.stringify({ type: 'auth-ok', userId }));
                markOnline(userId);
            } catch (e) {
                ws.send(JSON.stringify({ type: 'auth-fail' }));
            }
            return;
        }

        if (!userId) return;

        if (type === 'message') {
            const { toId } = msg;
            const clientId = msg.clientId; // optional client-side id for reconciliation
            // Accept both plain text or structured message payloads
            const incoming = msg.message || {};
            const content = msg.text || incoming.content || incoming.text || '';
            const msgType = incoming.type || (msg.type === 'message' ? 'text' : incoming.type) || 'text';

            // Persist message
            const convoId = [userId, toId].sort().join('-');
            if (!state.messages[convoId]) state.messages[convoId] = [];
            const m = {
                id: require('crypto').randomBytes(6).toString('hex'),
                from: userId,
                to: toId,
                type: msgType,
                content,
                timestamp: Date.now(),
                read: false
            };
            state.messages[convoId].push(m);
            save.messages();

            // Forward to recipient
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                // include clientId if provided so recipient can correlate if needed
                targetWs.send(JSON.stringify({ type: 'new-message', message: m, clientId }));
            }

            // Ack sender: reply with server id and also echo clientId so client can reconcile optimistic UI
            ws.send(JSON.stringify({ type: 'delivered', id: m.id, to: toId, ts: Date.now(), clientId }));
            return;
        }

        if (type === 'typing') {
            const { toId } = msg;
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({ type: 'user-typing', from: userId }));
            }
            return;
        }

        if (type === 'delivered') {
            const { id, toId } = msg; // toId is the original sender
            const senderWs = connections.get(toId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                senderWs.send(JSON.stringify({ type: 'delivered', id, from: userId, ts: Date.now() }));
            }
            return;
        }

        // Read receipts: client notifies that one or more message ids were read
        if (type === 'read') {
            const { ids, toId } = msg; // toId is the original sender of the messages
            let readIds = ids;
            if (!Array.isArray(readIds)) readIds = [readIds];
            // mark messages as read in state (best-effort)
            try {
                const convoId = [userId, toId].sort().join('-');
                const msgs = state.messages[convoId] || [];
                readIds.forEach(rid => {
                    const mm = msgs.find(x => x.id === rid);
                    if (mm) mm.read = true;
                });
                save.messages();
            } catch (e) { /* ignore */ }

            // notify original sender that these messages were read
            const senderWs = connections.get(toId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                senderWs.send(JSON.stringify({ type: 'read', ids: readIds, from: userId, ts: Date.now() }));
            }

            return;
        }

        // Note: signal (WebRTC) and snap-sent logic also goes here
        if (msg.type === 'snap-sent') {
            const { toId } = msg;
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({
                    type: 'snap-notification',
                    from: userId,
                    fromUsername: state.users[userId]?.username || 'Unknown'
                }));
            }
            // renew streak for both participants
            try {
                const streaks = require('./streaks');
                streaks.renewStreak(userId, toId);
                streaks.renewStreak(toId, userId);
            } catch (e) { /* best-effort */ }
        }

        // WebRTC signaling
        if (type === 'call-offer' || type === 'call-answer' || type === 'ice-candidate' || type === 'call-reject') {
            const { toId } = msg;
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({ ...msg, from: userId }));
            }
        }

        if (type === 'signal') {
            const { toId, data } = msg;
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({ type: 'signal', from: userId, data }));
            }
        }
    });

    ws.on('close', () => {
        if (userId) {
            connections.delete(userId);
            markOffline(userId);
        }
    });
}

module.exports = {
    handleConnection,
    connections // Export if needed
};
