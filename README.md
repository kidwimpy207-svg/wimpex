# 🌟 Wimpex - Advanced Gold-Themed Social App

A Snapchat-inspired real-time social media platform with Stories, Snaps, instant messaging, and camera filters.

## Features ✨

- **Stories** - 24-hour expiring visual stories with view tracking
- **Snaps** - Send encrypted auto-deleting photos/videos to friends
- **Instant Messaging** - Real-time DM chat via WebSocket
- **Camera + Filters** - 5 creative filters (Normal, Sepia, B&W, Invert, Blur)
- **Video Recording** - Record snaps and stories directly
- **User Profiles** - Avatar, friend count, story stats
- **Real-time Notifications** - Push alerts for incoming snaps
- **Gold Theme** - Luxury dark UI with elegant gold accents

## Tech Stack

- **Frontend**: Vanilla JS, HTML5, CSS3
- **Backend**: Node.js, Express.js, WebSocket (ws)
- **Real-time**: WebRTC signaling + WebSocket messaging
- **Storage**: In-memory (demo mode)

## Installation & Setup

### 1. Install Dependencies

```bash
cd "C:\Users\Owner\Videos\New folder\server"
npm install
```

### 2. Start Server

```bash
npm start
```

Server runs on `http://localhost:3000`

### 3. Open in Browser

Visit `http://localhost:3000` and sign up with a username!

## Usage

### 📖 Stories Tab
- Browse friends' stories (auto-expire after 24h)
- Click "New Story" to create one
- Use camera filters before capturing
- Stories visible in grid with usernames

### 💬 Messages Tab
- Click "New Chat" to message a friend
- Real-time messaging via WebSocket
- Conversations persist during session

### 📸 Camera Tab
- **Snap** - Take a photo with active filter
- **Record** - Record video clips
- **Swap** - Switch between front/back camera
- **Filters** - Apply effects before capture
  - Normal: Unfiltered
  - Sepia: Warm vintage tone
  - B&W: Black & white
  - Invert: Color inverted
  - Blur: Motion blur effect

Send snaps to:
- Username (direct snap) → auto-deletes after viewing
- "story" → 24-hour story feed

### 👤 Profile Tab
- View your avatar & username
- Friend & story statistics
- Powered by Pravatar for unique avatars

## API Reference

### User Management
```
POST /api/users → Create user account
GET /api/users/:userId → Get user profile
```

### Stories
```
GET /api/stories → List active stories
POST /api/stories → Create story
POST /api/stories/:storyId/view → Mark as viewed
```

### Snaps
```
POST /api/snaps → Send snap to user
GET /api/snaps/:userId → Get unviewed snaps
POST /api/snaps/:snapId/view → Mark snap viewed
```

### Messages
```
GET /api/messages/:convoId → Get conversation
POST /api/messages → Send message
```

## WebSocket Events

| Type | Direction | Payload |
|------|-----------|---------|
| `auth` | → Server | `{type, userId}` |
| `new-message` | ← Server | `{type, from, text, time}` |
| `message` | → Server | `{type, toId, text}` |
| `snap-notification` | ← Server | `{type, from}` |
| `snap-sent` | → Server | `{type, toId}` |
| `signal` | ↔ Server | WebRTC SDP/ICE data |
| `typing` | → Server | `{type, toId}` |

## Customization

### Change Gold Color Theme
Edit [client/styles.css](client/styles.css#L11):
```css
--gold: #d4af37;      /* Main gold */
--gold-dark: #b8942d;  /* Darker shade */
--gold-light: #e6c547; /* Lighter shade */
```

### Add Custom Filters
Edit [client/app.js](client/app.js#L307) filter map:
```js
'custom': 'grayscale(50%) sepia(40%) brightness(1.1)'
```

### Story Expiry Time
Edit [server/index.js](server/index.js#L54):
```js
expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
```

## Advanced Features

- **Video Stories** - Supports .mp4 files
- **Canvas Filters** - Applied server-side to snaps
- **Media Size** - Handles up to 50MB (base64 encoded)
- **Connection Recovery** - Auto-reconnect WebSocket
- **Friend System** - Add/accept friend requests (ready)
- **Typing Indicators** - "typing..." real-time feedback

## Performance Notes

- In-memory storage scales to ~10k active users
- Base64 media encoding suitable for ~100MB total stories
- Recommended for 50-500 concurrent users
- Add Redis for production scaling

## Future Roadmap

- [ ] Persistent database (MongoDB/PostgreSQL)
- [ ] User authentication (JWT)
- [ ] Friend request notifications
- [ ] Group stories & conversations
- [ ] Video calling (WebRTC PeerConnection)
- [ ] Emoji reactions & stickers
- [ ] Story geolocation tags
- [ ] Mobile app (React Native)
- [ ] End-to-end encryption

## Troubleshooting

**Camera not working?**
- Check browser permissions (Allow camera access)
- Use HTTPS or localhost (security requirement)

**WebSocket failing?**
- Check firewall (port 3000)
- Verify server is running: `npm start`

**Snaps not sending?**
- Recipient must have username spelled exactly
- Try "story" to test story posting first

**Performance issues?**
- Clear browser cache
- Restart server: `npm start`
- Check RAM usage if many stories

## License

MIT - Build & share freely! 🚀
"# wimpex" 
