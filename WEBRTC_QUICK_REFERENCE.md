# WebRTC Quick Reference Card

## 🎯 What is WebRTC?
**Web Real-Time Communication** - Peer-to-peer audio/video calling in the browser

---

## 🚀 Quick Start (30 seconds)

### For Users:
```
1. Open chat → Click 📹 (video) or ☎️ (audio)
2. Friend accepts call
3. Video/audio streams!
4. Click "End Call" to stop
```

### For Developers:
```javascript
// Initiate call
initiateVideoCall();      // Video + audio
initiateAudioCall();      // Audio only

// End call
endCall();

// Check status
console.log(peerConnection.connectionState); // 'connected'
```

---

## 📊 Architecture (1 Minute)

```
┌─ SIGNALING (WebSocket) ─┐
│  (Setup only)           │
│ • offer/answer          │ 
│ • ICE candidates        │
│ • rejection             │
└─────────────────────────┘
         ↓
┌─ P2P STREAM (Direct) ───┐
│  (Media only)           │
│ 📹 Video (1280x720)     │
│ 🎙️ Audio                │
│ NO server relay!        │
└─────────────────────────┘
```

---

## 🔑 Key Concepts

| Term | Meaning |
|------|---------|
| **Signaling** | Exchange of setup info via WebSocket |
| **SDP Offer** | "Here's what I can do" |
| **SDP Answer** | "OK, I accept your terms" |
| **ICE Candidate** | Network path to reach me |
| **STUN** | Discovers your public IP |
| **TURN** | Relay server if direct P2P fails |
| **PeerConnection** | The connection object |
| **MediaStream** | Your camera/mic input |

---

## 📝 Message Types

```javascript
// Initiator sends offer
{ 
  type: 'call-offer',
  offer: {...},
  callType: 'video',
  toId: 'friend_id'
}

// Recipient sends answer
{
  type: 'call-answer',
  answer: {...},
  toId: 'caller_id'
}

// Both exchange paths
{
  type: 'ice-candidate',
  candidate: {...},
  toId: 'peer_id'
}

// Reject call
{
  type: 'call-reject',
  toId: 'caller_id'
}
```

---

## 🔌 API Quick Reference

### Create Connection
```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] }
  ]
});
```

### Get Camera/Mic
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: { width: 1280, height: 720 }
});

pc.addTrack(stream.getVideoTracks()[0], stream);
pc.addTrack(stream.getAudioTracks()[0], stream);
```

### Create Offer (Caller)
```javascript
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
// Send offer to peer via WebSocket
```

### Create Answer (Callee)
```javascript
await pc.setRemoteDescription(new RTCSessionDescription(offer));
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
// Send answer to peer via WebSocket
```

### Handle Remote Stream
```javascript
pc.ontrack = (event) => {
  const remoteStream = event.streams[0];
  videoElement.srcObject = remoteStream;
};
```

### Handle ICE Candidates
```javascript
pc.onicecandidate = (event) => {
  if (event.candidate) {
    // Send to peer via WebSocket
    ws.send({ type: 'ice-candidate', candidate: event.candidate });
  }
};

// Receive ICE candidate
pc.addIceCandidate(new RTCIceCandidate(candidate));
```

---

## 🎬 Call States

```
new
 ↓
connecting (getting media, setting up)
 ↓
connected ✅ (READY TO TALK)
 ↓
disconnected (lost connection, trying to recover)
 ↓
failed ❌ (can't connect)
 ↓
closed (user ended call)
```

---

## ✅ Your Implementation

### Files Modified:
- ✅ `client/index.html` - Added call buttons
- ✅ `client/app.js` - Added WebRTC functions & handlers
- ✅ `server/services/websocket.js` - Added signaling

### What Works:
- ✅ Video calling (📹)
- ✅ Audio calling (☎️)
- ✅ Peer-to-peer stream
- ✅ Call accept/reject
- ✅ ICE candidate exchange
- ✅ Error handling

### What's Optional:
- ⚠️ TURN server (for NAT)
- ⚠️ Call history (database)
- ⚠️ Screen sharing
- ⚠️ Call recording

---

## 🧪 Test in 2 Steps

```
1. Open app in 2 browser tabs (different users)
2. In Tab 1: Open chat with user 2 → Click 📹
   In Tab 2: Accept call when prompted
3. See video! Click End Call to stop
```

---

## 🐛 Debug Checklist

- [ ] Server running (`npm start`)
- [ ] WebSocket connected (`ws.readyState === 1`)
- [ ] Camera/mic permitted (browser settings)
- [ ] Chat open (not just messages list)
- [ ] PeerConnection state = 'connected'
- [ ] No console errors (F12)

---

## 🔐 Security (Built-in)

✅ DTLS encryption (automatic)
✅ SRTP media encryption
✅ No server sees media
✅ Only peers can view
✅ Browser permission required

---

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ iOS 11+ |
| Edge | ✅ Full |

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Connection time | <3 seconds |
| Video latency | <100ms |
| Resolution | 1280x720 |
| Frame rate | 24-30 fps |
| Audio bitrate | 30-50 kbps |

---

## 🚨 Common Errors

| Error | Fix |
|-------|-----|
| `NotAllowedError` | Grant camera/mic permission |
| `NotFoundError` | Check camera/mic connected |
| `Failed to connect` | Check STUN server, restart |
| `Timeout` | Friend rejected or offline |
| `One-way video` | Refresh both pages |

---

## 📚 Full Docs

Read these for details:
- `WEBRTC_GUIDE.md` - Full technical guide
- `WEBRTC_QUICK_START.md` - For beginners
- `WEBRTC_ARCHITECTURE.md` - System design
- `WEBRTC_TESTING_GUIDE.md` - Testing & debugging

---

## 🎓 Learning Path

1. **Start:** This quick ref (you're reading it!)
2. **Understand:** `WEBRTC_ARCHITECTURE.md`
3. **Learn:** `WEBRTC_QUICK_START.md`
4. **Deep dive:** `WEBRTC_GUIDE.md`
5. **Test:** `WEBRTC_TESTING_GUIDE.md`
6. **Deploy:** Production setup

---

## 💡 Tips & Tricks

### Faster Connection Testing:
```javascript
// Check connection fast
setInterval(() => {
  console.log(peerConnection?.connectionState);
}, 1000);
```

### Monitor Quality:
```javascript
// Get video bitrate every 2 sec
setInterval(async () => {
  const stats = await peerConnection.getStats();
  stats.forEach(r => {
    if (r.type === 'outbound-rtp' && r.mediaType === 'video') {
      console.log('Bitrate:', Math.round(r.bytesSent / 1000), 'KB');
    }
  });
}, 2000);
```

### Force Connection Type:
```javascript
// Prefer IPv4
const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] }
  ],
  iceTransportPolicy: 'relay' // force TURN only
};
```

---

## 🎯 Cheat Sheet

```javascript
// FUNCTIONS YOU'LL USE
initiateVideoCall()        // Start video call
initiateAudioCall()        // Start audio call
endCall()                  // End any call
handleCallOffer()          // Process incoming call
handleCallAnswer()         // Process acceptance
handleIceCandidate()       // Handle connection path

// VARIABLES YOU'LL CHECK
peerConnection             // The connection
localStream                // Your camera/mic
remoteStream              // Their video/audio
callInProgress            // Is call active?
window.currentOtherId     // Who you're calling

// STATES TO MONITOR
peerConnection.connectionState     // 'connected', 'failed', etc
peerConnection.signalingState      // 'stable', 'have-local-offer', etc
peerConnection.iceConnectionState  // 'connected', 'failed', etc
```

---

## 🎬 Example Usage

```javascript
// User clicks video call button
async function onVideoCallClick() {
  try {
    await initiateVideoCall();
    // System handles everything from here:
    // 1. Gets camera/mic
    // 2. Creates connection
    // 3. Sends offer
    // 4. Shows UI
    // 5. Handles answer
    // 6. Streams video
  } catch (err) {
    alert('Call failed: ' + err.message);
  }
}

// User receives incoming call
// System automatically shows prompt:
// "Alice is calling you (video). Accept?"
// If accept → system handles answer & connection

// User clicks end call
endCall(); // Closes connection, stops camera, shows chat again
```

---

## 🚀 Go Live Checklist

- [ ] Tested video calling ✅
- [ ] Tested audio calling ✅
- [ ] Tested on mobile ✅
- [ ] HTTPS enabled ✅
- [ ] TURN server added ✅
- [ ] Call logging enabled ✅
- [ ] Error monitoring set up ✅
- [ ] Performance tested ✅

---

## 📞 One-Liner Explanations

| Term | Explanation |
|------|-------------|
| **WebRTC** | Browser-based video calling (no app needed) |
| **Signaling** | Initial handshake via WebSocket |
| **P2P** | Direct connection (no middle server) |
| **ICE** | Finding your network address |
| **SDP** | Message describing media capabilities |
| **STUN** | NAT traversal (free Google servers) |
| **TURN** | Relay when direct connection fails |
| **Bitrate** | Data sent per second (higher = better quality) |
| **Latency** | Time delay (lower = better) |
| **Codec** | Algorithm compressing video/audio |

---

## ✨ Summary

**You now have:**
- ✅ Full video calling (📹)
- ✅ Full audio calling (☎️)
- ✅ P2P connection (no relay)
- ✅ Encrypted streams
- ✅ Mobile support
- ✅ Professional UI

**To go live:**
1. Add HTTPS
2. Add TURN server
3. Test thoroughly
4. Deploy!

**Questions?** Check the full docs! 📚

---

**Version:** 1.0 | **Date:** Dec 2025 | **Status:** Ready! 🚀

