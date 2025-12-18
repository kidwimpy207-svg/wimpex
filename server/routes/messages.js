const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { state, save } = require('../services/store');
const { connections } = require('../services/websocket');
const { authenticateToken } = require('../middleware/auth');
const { sendPush } = require('../services/notification');

function genId() { return crypto.randomBytes(6).toString('hex'); }

// Initialize groups in state if not present
if (!state.groups) state.groups = {};

// Get messages from conversation (1:1 or group)
router.get('/:conversationId', authenticateToken, (req, res) => {
    try {
        const { conversationId } = req.params;
        // If a plain user id was provided, treat as 1:1 chat and compute conversation id
        let convoId = conversationId;
        if (!String(conversationId).startsWith('group-')) {
            convoId = [req.user.userId, conversationId].sort().join('-');
        }
        const convoMessages = state.messages[convoId] || [];
        res.json(convoMessages);
    } catch (e) {
        console.error('[Messages GET] Error:', e);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Post a message to conversation (1:1 or group)
// Supports message `type`: 'text' (default), 'emoji', 'sticker', 'audio'
// For 'text' use `text`; for other types use `content` (e.g. sticker id or audio URL)
router.post('/', authenticateToken, (req, res) => {
    try {
        const { toId, groupId, text, type = 'text', content } = req.body;

        if (type === 'text' && !text) return res.status(400).json({ error: 'Text required for text messages' });
        if (type !== 'text' && !content) return res.status(400).json({ error: 'Content required for non-text messages' });

        let convoId;
        let recipients = [];

        if (groupId) {
            // Group message
            const group = state.groups[groupId];
            if (!group) return res.status(404).json({ error: 'Group not found' });
            if (!group.members.includes(req.user.userId)) {
                return res.status(403).json({ error: 'Not a member of this group' });
            }
            convoId = `group-${groupId}`;
            recipients = group.members.filter(id => id !== req.user.userId);
        } else if (toId) {
            // 1:1 message
            convoId = [req.user.userId, toId].sort().join('-');
            recipients = [toId];
        } else {
            return res.status(400).json({ error: 'toId or groupId required' });
        }

        if (!state.messages[convoId]) state.messages[convoId] = [];

        const msg = {
            id: genId(),
            from: req.user.userId,
            fromUsername: state.users[req.user.userId]?.username,
            type,
            content: type === 'text' ? text : content,
            timestamp: Date.now(),
            readBy: [req.user.userId]
        };

        state.messages[convoId].push(msg);
        save.messages();

        // Build preview for push notifications
        let preview = '';
        if (type === 'text') preview = (text || '').slice(0, 120);
        else if (type === 'emoji') preview = content;
        else if (type === 'sticker') preview = 'Sent a sticker';
        else if (type === 'audio') preview = 'Sent a voice message';
        else preview = 'New message';

        // Send push to all recipients
        const fromUser = state.users[req.user.userId];
        recipients.forEach(recipientId => {
            sendPush(recipientId, {
                title: `${fromUser?.username || 'Someone'} sent a message`,
            body: preview,
            url: '/',
            actions: [{ action: 'view', title: 'Open' }]
        }).catch(console.error);
    });

    res.json(msg);
    } catch (e) {
        console.error('[Messages POST] Error:', e.message, e.stack);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark messages as read
router.post('/read', authenticateToken, (req, res) => {
    try {
        console.log('[Messages Read] Received request:', { userId: req.user?.userId, body: req.body });
        
        const { messageIds, conversationId } = req.body;
        if (!Array.isArray(messageIds) || !conversationId) {
            return res.status(400).json({ error: 'messageIds array and conversationId required' });
        }

        const msgs = state.messages[conversationId] || [];
        console.log('[Messages Read] Found', msgs.length, 'messages in conversation', conversationId);
        
        let updated = 0;
        msgs.forEach(m => {
            if (!m.readBy) m.readBy = [];
            if (messageIds.includes(m.id) && !m.readBy.includes(req.user.userId)) {
                m.readBy.push(req.user.userId);
                updated++;
            }
        });

        if (updated > 0) {
            save.messages();
            console.log('[Messages Read] Updated', updated, 'messages');
        }
        res.json({ ok: true, updated });
    } catch (e) {
        console.error('[Messages READ] Error:', e.message, e.stack);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// Create a group
router.post('/groups', authenticateToken, (req, res) => {
    const { name, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name required' });

    const groupId = genId();
    const members = [req.user.userId];
    if (Array.isArray(memberIds)) {
        members.push(...memberIds.filter(id => !members.includes(id)));
    }

    state.groups[groupId] = {
        groupId,
        name,
        createdBy: req.user.userId,
        createdAt: Date.now(),
        members,
        avatar: `https://i.pravatar.cc/150?u=${groupId}`
    };

    save.groups?.() || null; // Save if save.groups exists

    res.json({ ok: true, groupId, group: state.groups[groupId] });
});

// Get user's groups
router.get('/user/groups', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const userGroups = Object.values(state.groups || {})
        .filter(g => g.members.includes(userId))
        .map(g => ({
            groupId: g.groupId,
            name: g.name,
            avatar: g.avatar,
            memberCount: g.members.length
        }));

    res.json(userGroups);
});

// Get group details
router.get('/groups/:groupId', authenticateToken, (req, res) => {
    const group = state.groups?.[req.params.groupId];
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.members.includes(req.user.userId)) {
        return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json(group);
});

// Add member to group
router.post('/groups/:groupId/members', authenticateToken, (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = state.groups?.[groupId];

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.members.includes(req.user.userId)) {
        return res.status(403).json({ error: 'Not a member of this group' });
    }

    if (!group.members.includes(userId)) {
        group.members.push(userId);
        save.groups?.() || null;
    }

    res.json({ ok: true });
});

// Acknowledge messages (legacy endpoint)
router.post('/ack', authenticateToken, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    let updated = 0;
    Object.values(state.messages).forEach(arr => {
        arr.forEach(m => {
            if (ids.includes(m.id)) { m.delivered = true; m.read = true; updated++; }
        });
    });
    save.messages();
    res.json({ ok: true, updated });
});

// Sync messages
router.get('/sync', authenticateToken, (req, res) => {
    const uid = req.user.userId;
    const undelivered = [];
    Object.values(state.messages).forEach(arr => {
        arr.forEach(m => {
            if (m.to === uid && !m.delivered) undelivered.push(m);
        });
    });
    res.json({ undelivered });
});

// Delete a message for me or for everyone
router.delete('/:conversationId/:messageId', authenticateToken, (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const scope = req.query.scope || 'me'; // 'me' or 'all'
        let convoId = conversationId;
        if (!String(conversationId).startsWith('group-')) {
            // normalize 1:1 conversation id
            convoId = [req.user.userId, conversationId].sort().join('-');
        }
        const msgs = state.messages[convoId] || [];
        const idx = msgs.findIndex(m => m.id === messageId);
        if (idx === -1) return res.status(404).json({ error: 'Message not found' });
        const msg = msgs[idx];
        if (scope === 'all') {
            // only allow delete for all from sender or admin
            if (msg.from !== req.user.userId && !state.admins?.includes(req.user.userId)) return res.status(403).json({ error: 'Not allowed' });
            msgs.splice(idx, 1);
            save.messages();

            // Broadcast deletion to all participants in the conversation
            try {
                let participants = [];
                if (String(convoId).startsWith('group-')) {
                    const gid = convoId.replace(/^group-/, '');
                    const group = state.groups?.[gid];
                    participants = group ? group.members : [];
                } else {
                    participants = convoId.split('-');
                }

                const WS = require('ws');
                participants.forEach(pid => {
                    const targetWs = connections.get(pid);
                    if (targetWs && targetWs.readyState === WS.OPEN) {
                        targetWs.send(JSON.stringify({
                            type: 'message-deleted',
                            conversationId: convoId,
                            messageId,
                            scope: 'all',
                            by: req.user.userId
                        }));
                    }
                });
            } catch (e) { /* best-effort broadcast */ }

            return res.json({ ok: true, deleted: true });
        } else {
            // mark deleted for this user
            if (!msg.deletedFor) msg.deletedFor = [];
            if (!msg.deletedFor.includes(req.user.userId)) msg.deletedFor.push(req.user.userId);
            save.messages();

            // Notify the requesting user's other active clients that the message was deleted for them
            try {
                const WS = require('ws');
                const targetWs = connections.get(req.user.userId);
                if (targetWs && targetWs.readyState === WS.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'message-deleted',
                        conversationId: convoId,
                        messageId,
                        scope: 'me',
                        by: req.user.userId
                    }));
                }
            } catch (e) { /* ignore */ }

            return res.json({ ok: true, deletedFor: req.user.userId });
        }
    } catch (e) {
        console.error('[Messages DELETE] Error:', e);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
