# WebRTC Quick Start - Wimpex

## What is WebRTC?
WebRTC = **Web Real-Time Communication**

It enables peer-to-peer audio/video calls directly between browsers WITHOUT needing a video server (like Zoom/Google Meet servers).

```
You                                        Friend
[Camera/Mic] ━━━━━━━ Direct Connection ━━━━━━━ [Camera/Mic]
   (peer)  ←→ Signaling Server ←→  (peer)
             (WebSocket - handles setup)
```

---

## How It Works in Wimpex

### 1️⃣ **User Initiates Call**
   - Click **📹** (video call) or **☎️** (audio call) button in chat
   - Your browser creates an "offer" with your media capabilities
   - Offer sent via WebSocket to recipient

### 2️⃣ **Recipient Accepts**
   - Gets a call prompt
   - Clicks "Accept" if they want to join
   - Browser creates an "answer" confirming they accept
   - Answer sent back via WebSocket

### 3️⃣ **Connection Established**
   - Both browsers exchange "ICE candidates" (network paths)
   - Peer-to-peer connection established
   - **Audio/video flows directly** between peers (no server in between)

### 4️⃣ **Call Active**
   - Both see live video/audio
   - Call timer counts up
   - Click **End Call** to disconnect

---

## Using WebRTC in Wimpex

### **Video Call**
```javascript
// Automatically triggered when clicking 📹 button
initiateVideoCall();

// Inside: Gets camera + microphone, creates offer, shows video
```

### **Audio Call**
```javascript
// Automatically triggered when clicking ☎️ button
initiateAudioCall();

// Inside: Gets microphone only, creates offer, shows audio UI
```

### **End Call**
```javascript
endCall();

// Inside: Closes connection, stops camera/mic, hides UI
```

---

## Technical Flow

```
Step 1: Caller creates offer
┌─────────────────────────────────┐
│ initiateVideoCall() called       │
│ ├─ getLocalStream() - get cam   │
│ ├─ createPeerConnection()       │
│ ├─ createOffer() - SDP offer    │
│ └─ Send via WebSocket           │
└─────────────────────────────────┘
          ↓ (WebSocket)
┌─────────────────────────────────┐
│ Recipient receives offer        │
│ ├─ Show confirm dialog          │
│ ├─ handleCallOffer()            │
│ ├─ getLocalStream() - get cam   │
│ ├─ createAnswer() - SDP answer  │
│ └─ Send back via WebSocket      │
└─────────────────────────────────┘
          ↓ (WebSocket)
┌─────────────────────────────────┐
│ Caller receives answer          │
│ ├─ handleCallAnswer()           │
│ └─ Connection ready!            │
└─────────────────────────────────┘

Step 2: Exchange ICE Candidates (network paths)
Both sides send ICE candidates via WebSocket to establish connection

Step 3: P2P Connection Active
Audio/video streams flow directly between peers
```

---

## Key Components

### **PeerConnection**
```javascript
peerConnection = new RTCPeerConnection(ICE_SERVERS);
```
- The actual connection object
- Handles offers, answers, ICE candidates
- Manages media tracks (audio/video)

### **MediaStream**
```javascript
localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
```
- Your camera/microphone input
- Added to peer connection: `peerConnection.addTrack(track, localStream)`

### **SDP (Session Description Protocol)**
```javascript
offer = await peerConnection.createOffer();
answer = await peerConnection.createAnswer();
```
- Text-based protocol describing media
- Sent between peers to describe capabilities

### **ICE Candidates**
```javascript
peerConnection.onicecandidate = (event) => {
  ws.send({ type: 'ice-candidate', candidate: event.candidate });
}
```
- Network addresses for connecting
- Auto-collected by browser
- Sent to peer to enable connection

### **STUN Server**
```javascript
{ urls: ['stun:stun.l.google.com:19302'] }
```
- Helps discover public IP address
- Used to establish direct connection
- Free to use (Google provides public STUN servers)

---

## Troubleshooting

### ❌ "No sound/video"
**Solution:** Check browser camera/mic permissions
- Go to site settings → Camera/Microphone → Allow

### ❌ "Connection failed"
**Reason:** One-way NAT or firewall blocking P2P
**Solution:** 
- Add TURN server to `ICE_SERVERS`
- Or test on same network first

### ❌ "Can see them but they can't see me"
**Reason:** One side not receiving video track
**Solution:** Ensure both sides called `getLocalStream()` and `addTrack()`

### ❌ "Call hangs when initiating"
**Reason:** WebSocket not sending messages properly
**Check:**
```javascript
console.log('WS state:', ws.readyState); // Should be 1 (OPEN)
```

---

## File Changes Made

### Updated Files:
1. **`client/app.js`**
   - Added WebRTC functions: `initiateVideoCall()`, `initiateAudioCall()`, `endCall()`
   - Added handlers: `handleCallOffer()`, `handleCallAnswer()`, `handleIceCandidate()`
   - Added WebSocket listeners for WebRTC messages

2. **`server/services/websocket.js`**
   - Added signaling for `call-offer`, `call-answer`, `ice-candidate`, `call-reject`

3. **`client/index.html`**
   - Added **📹** (video call) button
   - Added **☎️** (audio call) button

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (iOS 11+) |
| Edge | ✅ Full |
| Mobile Chrome | ✅ Full |
| Mobile Firefox | ✅ Full |

---

## Next Steps (Production Ready)

### Add TURN Server (for NAT traversal)
```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: ['turn:your-turn-server.com:3478'],
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

### Add Screen Sharing
```javascript
async function shareScreen() {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  // Replace video track with screen
}
```

### Add Recording
```javascript
const recorder = new MediaRecorder(localStream);
recorder.ondataavailable = (e) => {
  const blob = e.data;
  // Save or upload blob
};
recorder.start();
```

---

## Example: Testing Locally

1. Open browser: `http://localhost:3000`
2. Login as **User A** in Tab 1
3. Open new tab, Login as **User B** in Tab 2
4. **User A** opens chat with User B
5. **User A** clicks **📹** (video call)
6. **User B** gets call prompt → clicks "OK"
7. Both see each other's video!
8. Click **End Call** when done

---

## Summary

✅ **What you now have:**
- Full video/audio calling
- Real-time communication via WebRTC
- Automatic ICE candidate exchange
- Call UI with timer
- Mobile-friendly

🚀 **Ready to deploy!** Just add TURN server for production reliability.

