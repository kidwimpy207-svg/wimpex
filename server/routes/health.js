// Health & status routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { store } = require('../services/store');

// Health check (public, for uptime monitoring)
router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
    },
  });
});

// Status dashboard (admin only)
router.get('/status', authenticateToken, (req, res) => {
  try {
    const user = store.users.find((u) => u.userId === req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const stats = {
      timestamp: new Date(),
      users: {
        total: store.users?.length || 0,
        active: (store.users || []).filter((u) => u.lastLogin && Date.now() - new Date(u.lastLogin) < 7 * 24 * 60 * 60 * 1000).length,
        verified: (store.users || []).filter((u) => u.emailConfirmed).length,
      },
      content: {
        posts: (store.stories || []).filter((s) => !s.deleted).length,
        deleted: (store.stories || []).filter((s) => s.deleted).length,
      },
      reports: {
        total: (store.reports || []).length,
        pending: (store.reports || []).filter((r) => r.status === 'pending').length,
      },
      system: {
        uptime: Math.floor(process.uptime()),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    };

    res.json(stats);
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
