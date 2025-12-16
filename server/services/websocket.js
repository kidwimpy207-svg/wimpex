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
            const { toId, text } = msg;
            // Persist message
            const convoId = [userId, toId].sort().join('-');
            if (!state.messages[convoId]) state.messages[convoId] = [];
            const m = {
                id: require('crypto').randomBytes(6).toString('hex'),
                from: userId,
                to: toId,
                text,
                timestamp: Date.now(),
                read: false
            };
            state.messages[convoId].push(m);
            save.messages();

            // Forward to recipient
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({ type: 'new-message', message: m }));
            }

            // Ack sender
            ws.send(JSON.stringify({ type: 'delivered', id: m.id, to: toId, ts: Date.now() }));
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

        // Note: signal (WebRTC) and snap-sent logic also goes here
        if (type === 'snap-sent') {
            const { toId } = msg;
            const targetWs = connections.get(toId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify({
                    type: 'snap-notification',
                    from: userId,
                    fromUsername: state.users[userId]?.username || 'Unknown'
                }));
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
