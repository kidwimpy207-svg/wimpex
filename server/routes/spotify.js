const express = require('express');
const router = express.Router();
const { state, save } = require('../services/store');
const { authenticateToken } = require('../middleware/auth');
const fetch = require('../utils/fetch');

// In-memory state to map oauth states to userIds
const spotifyStates = new Map();

function ensureEnv() {
  return process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET;
}

// Previously this endpoint required the Authorization header when opened in a popup.
// To support popup flows without auth headers, the client should call POST /session
// which creates a short-lived stateKey mapped to the user. The popup then opens
// GET /authorize?state=<stateKey> which will be validated here.
router.get('/authorize', (req, res) => {
  const stateKey = req.query.state;
  if (!stateKey) return res.status(400).send('Missing state');
  const mappedUser = spotifyStates.get(stateKey);
  if (!mappedUser) return res.status(400).send('Invalid or expired state');
  if (!ensureEnv()) return res.status(500).json({ error: 'Spotify client id/secret not configured on server' });
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback`;
  const scope = encodeURIComponent('user-read-private user-read-email');
  const params = `client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(stateKey)}`;
  const authUrl = `https://accounts.spotify.com/authorize?${params}`;
  // Redirect user to Spotify authorize page
  res.redirect(authUrl);
});

// Create a short-lived oauth session (state key) for the current authenticated user.
router.post('/session', authenticateToken, (req, res) => {
  if (!ensureEnv()) return res.status(500).json({ error: 'Spotify client id/secret not configured on server' });
  const stateKey = 'st_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  // store mapping userId => stateKey
  spotifyStates.set(stateKey, req.user.userId);
  // expire after short TTL
  setTimeout(() => spotifyStates.delete(stateKey), 5 * 60 * 1000);
  const redirectUrl = `/api/spotify/authorize?state=${encodeURIComponent(stateKey)}`;
  res.json({ url: redirectUrl, state: stateKey });
});

router.get('/callback', async (req, res) => {
  const { code, state: stateKey, error } = req.query;
  if (error) return res.status(400).send(`Spotify auth error: ${error}`);
  const userId = spotifyStates.get(stateKey);
  if (!userId) return res.status(400).send('Invalid or expired state');
  spotifyStates.delete(stateKey);

  if (!ensureEnv()) return res.status(500).send('Spotify client not configured on server');

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback` })
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return res.status(500).send('Failed to exchange token: ' + t);
    }
    const tokenJson = await tokenRes.json();
    // Persist tokens on user object
    const user = state.users[userId];
    if (!user) return res.status(404).send('User not found');
    user.spotify = {
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      scope: tokenJson.scope,
      token_type: tokenJson.token_type,
      expires_at: Date.now() + (tokenJson.expires_in || 3600) * 1000
    };
    save.users();
    // Redirect back to client profile or settings page
    res.send('<html><body><script>window.close();</script><p>Spotify connected. You can close this window.</p></body></html>');
  } catch (e) {
    console.error('Spotify callback error', e);
    res.status(500).send('Server error during Spotify token exchange');
  }
});

async function refreshTokenForUser(user) {
  if (!user?.spotify?.refresh_token) return false;
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: user.spotify.refresh_token })
    });
    if (!r.ok) return false;
    const j = await r.json();
    user.spotify.access_token = j.access_token;
    if (j.refresh_token) user.spotify.refresh_token = j.refresh_token;
    user.spotify.expires_at = Date.now() + (j.expires_in || 3600) * 1000;
    save.users();
    return true;
  } catch (e) {
    console.warn('Failed to refresh spotify token', e);
    return false;
  }
}

router.get('/search', authenticateToken, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const user = state.users[req.user.userId];
  if (!user || !user.spotify) return res.status(400).json({ error: 'User has not connected Spotify' });
  if (Date.now() > (user.spotify.expires_at || 0)) {
    const ok = await refreshTokenForUser(user);
    if (!ok) return res.status(400).json({ error: 'Spotify token expired and refresh failed' });
  }

  try {
    const url = `https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', limit: '10' }).toString()}`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${user.spotify.access_token}` } });
    if (!r.ok) return res.status(500).json({ error: 'Spotify API failed' });
    const j = await r.json();
    const tracks = (j.tracks?.items || []).map(t => ({ id: t.id, name: t.name, artists: t.artists.map(a => a.name).join(', '), preview_url: t.preview_url, album: { name: t.album.name, images: t.album.images } }));
    res.json(tracks);
  } catch (e) {
    console.error('Spotify search error', e);
    res.status(500).json({ error: 'Server error searching Spotify' });
  }
});

module.exports = router;
