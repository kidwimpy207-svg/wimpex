const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const { sendPush } = require('../services/notification');

router.get('/', authenticateToken, (req, res) => {
    const user = state.users[req.user.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendsList = (user.friends || []).map(friendId => {
        const friend = state.users[friendId];
        if (!friend) return null;
        return {
            userId: friend.userId,
            username: friend.username,
            avatar: friend.avatar,
            bio: friend.bio,
            phone: friend.phone || ''
        };
    }).filter(Boolean);

    res.json(friendsList);
});

router.post('/add', authenticateToken, (req, res) => {
    const { targetId } = req.body;
    const user = state.users[req.user.userId];
    const targetUser = state.users[targetId];

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (user.friends.includes(targetId)) return res.status(400).json({ error: 'Already friends' });

    user.friends.push(targetId);
    targetUser.followers.push(req.user.userId);
    save.users();

    sendPush(targetId, {
        title: `${user.username} added you`,
        body: 'You have a new friend',
        url: '/',
        actions: [{ action: 'view', title: 'View' }]
    }).catch(console.error);

    res.json({ ok: true });
});

router.post('/remove', authenticateToken, (req, res) => {
    const { targetId } = req.body;
    const user = state.users[req.user.userId];
    const targetUser = state.users[targetId];

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    user.friends = user.friends.filter(id => id !== targetId);
    targetUser.followers = targetUser.followers.filter(id => id !== req.user.userId);
    save.users();

    res.json({ ok: true });
});

router.get('/recommendations', authenticateToken, (req, res) => {
    const user = state.users[req.user.userId];
    const potential = Object.values(state.users)
        .filter(u =>
            u.userId !== user.userId &&
            !user.friends.includes(u.userId) &&
            u.emailConfirmed === true
        )
        .map(u => ({
            userId: u.userId,
            username: u.username,
            avatar: u.avatar,
            bio: u.bio,
            mutualFriends: user.friends.filter(fId => (state.users[fId]?.friends || []).includes(u.userId)).length
        }))
        .sort((a, b) => b.mutualFriends - a.mutualFriends)
        .slice(0, 12);

    res.json(potential);
});

module.exports = router;
