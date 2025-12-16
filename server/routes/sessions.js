const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');

// Get user sessions
router.get('/sessions', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userSessions = state.sessions?.[userId] || [];
  
  res.json(userSessions.map(s => ({
    sessionId: s.sessionId,
    deviceName: s.deviceName,
    deviceType: s.deviceType,
    ipAddress: s.ipAddress?.substring(0, 10) + '***', // mask IP
    lastActive: s.lastActive,
    createdAt: s.createdAt,
    trusted: s.trusted
  })));
});

// Revoke a specific session
router.post('/sessions/:sessionId/revoke', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  if (!state.sessions) state.sessions = {};
  if (!state.sessions[userId]) return res.status(404).json({ error: 'No sessions' });
  
  state.sessions[userId] = state.sessions[userId].filter(s => s.sessionId !== req.params.sessionId);
  save.sessions?.();
  res.json({ ok: true });
});

// Revoke all other sessions (except current)
router.post('/sessions/revoke-all-others', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const currentSessionId = req.sessionId || 'current';
  
  if (!state.sessions) state.sessions = {};
  if (!state.sessions[userId]) {
    state.sessions[userId] = [];
  } else {
    state.sessions[userId] = state.sessions[userId].filter(s => s.sessionId === currentSessionId);
  }
  save.sessions?.();
  res.json({ ok: true, message: 'All other sessions revoked' });
});

// Get connected devices
router.get('/devices', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userDevices = state.devices?.[userId] || [];
  
  res.json(userDevices.map(d => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    deviceType: d.deviceType,
    lastSeen: d.lastSeen,
    trusted: d.trusted,
    pushSubscribed: !!d.pushEndpoint
  })));
});

// Trust a device (skip 2FA)
router.post('/devices/:deviceId/trust', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  if (!state.devices) state.devices = {};
  if (!state.devices[userId]) return res.status(404).json({ error: 'Device not found' });
  
  const device = state.devices[userId].find(d => d.deviceId === req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  device.trusted = true;
  device.trustedAt = Date.now();
  save.devices?.();
  res.json({ ok: true });
});

// Untrust a device
router.post('/devices/:deviceId/untrust', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  if (!state.devices) state.devices = {};
  if (!state.devices[userId]) return res.status(404).json({ error: 'Device not found' });
  
  const device = state.devices[userId].find(d => d.deviceId === req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  device.trusted = false;
  save.devices?.();
  res.json({ ok: true });
});

// Remove a device
router.post('/devices/:deviceId/remove', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  if (!state.devices) state.devices = {};
  if (!state.devices[userId]) return res.status(404).json({ error: 'No devices' });
  
  state.devices[userId] = state.devices[userId].filter(d => d.deviceId !== req.params.deviceId);
  save.devices?.();
  res.json({ ok: true });
});

module.exports = router;
