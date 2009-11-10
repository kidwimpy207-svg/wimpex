# WebRTC Architecture - Wimpex

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WIMPEX SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENT (Browser)              SERVER (Node.js)                │
│  ──────────────────            ──────────────────              │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐           │
│  │   WebSocket      │◄────────►│   WebSocket      │           │
│  │   Connection     │          │   Handler        │           │
│  └──────────────────┘          └──────────────────┘           │
│         │                              │                        │
│         │ (Signaling messages)        │                        │
│         │ - offer                     │                        │
│         │ - answer                    │ (Forwards between      │
│         │ - ice-candidate            │  connected users)      │
│         └──────────────────────────────┘                        │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  PeerConnection  │                                          │
│  │  (RTCPeerConnection)                                        │
│  └──────────────────┘                                          │
│         │                                                       │
│         ├─ Audio Track                                         │
│         ├─ Video Track                                         │
│         └─ ICE State Machine                                   │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐           │
│  │  Local Media     │          │  Remote Media    │           │
│  │  ──────────────  │◄────────►│  ──────────────  │           │
│  │ • Camera         │  Direct   │ • Friend Video   │           │
│  │ • Microphone     │  P2P      │ • Friend Audio   │           │
│  └──────────────────┘          └──────────────────┘           │
│                                   (Other User's Browser)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Call Flow Diagram

```
USER A (Caller)                 SERVER                    USER B (Callee)
    │                              │                            │
    │ Click 📹 button              │                            │
    ├─ getLocalStream()            │                            │
    ├─ createPeerConnection()      │                            │
    ├─ createOffer()               │                            │
    │                              │                            │
    ├──── 1️⃣ call-offer ────────────────────────────────────►│
    │                              │ (forward)                  │
    │                              │                            │
    │                              │ User gets prompt           │
    │                              │ (Accept/Decline)           │
    │                              │                            │
    │                              │◄─ 2️⃣ call-answer ────────│
    │◄──── 2️⃣ call-answer ─────────│ (forward)                 │
    │   (setRemoteDescription)     │                            │
    │                              │                            │
    │ ├─ Exchange ICE Candidates ──────────────────────────────►│
    │ │ (Multiple ice-candidate msg)                            │
    │ │                            │                            │
    │ ◄─ Exchange ICE Candidates ─────────────────────────────◄─│
    │    (Multiple ice-candidate msg)                           │
    │                              │                            │
    │◄═════════════ 🎥 P2P MEDIA STREAM ════════════════════════│
    │    (Direct connection via STUN/TURN servers)              │
    │   Video/Audio flows directly, NOT through server         │
    │                                                            │
    ├─ Display video from User B                               │
    │ Show call timer (00:00)                                  │
    │                                                            │
    │ [Call active...]                                          │
    │                                                            │
    │ Click "End Call"                                          │
    ├─ peerConnection.close()                                  │
    ├─ localStream.getTracks().stop()                          │
    │                                                            │
    └────────────────────────────────────────────────────────────
```

---

## Message Types (WebSocket)

### **Initiating Call**

```javascript
{
  type: 'call-offer',
  toId: 'user123',
  callId: 'call_1701234567890',
  offer: {
    type: 'offer',
    sdp: '...' // SDP string describing media
  },
  callType: 'video', // or 'audio'
  fromUsername: 'Alice'
}
```

### **Accepting Call**

```javascript
{
  type: 'call-answer',
  toId: 'user456',
  callId: 'call_1701234567890',
  answer: {
    type: 'answer',
    sdp: '...' // SDP string with response
  }
}
```

### **ICE Candidate**

```javascript
{
  type: 'ice-candidate',
  toId: 'user123',
  candidate: {
    candidate: '...',          // Connection string
    sdpMLineIndex: 0,
    sdpMid: 'video'
  }
}
```

### **Rejecting Call**

```javascript
{
  type: 'call-reject',
  toId: 'user456',
  callId: 'call_1701234567890'
}
```

---

## ICE Candidate Discovery

```
Browser needs to find its own address to send to peer:

Step 1: STUN Query
┌──────────┐     STUN Request      ┌──────────────┐
│ Browser  │ ────────────────────► │ STUN Server  │
│          │                        │ (Google)     │
│          │ ◄──── Public IP ───────│              │
└──────────┘                        └──────────────┘
     │
     └─► "Your IP is 203.0.113.45:54321"
     
Step 2: Collect all possible paths
     ├─ Direct (best)
     ├─ Reflexive (via STUN)
     └─ Relay (via TURN if needed)

Step 3: Send all to peer
     ├─ ice-candidate #1
     ├─ ice-candidate #2
     ├─ ice-candidate #3
     └─ (multiple messages)

Step 4: Peer tries each path
     └─► Connection succeeds on one path

Result: Direct P2P connection established!
```

---

## Connection States

```javascript
peerConnection.connectionState can be:

'new'          → Peer connection created
     ↓
'connecting'   → Setting up connection
     ↓
'connected'    → ✅ Ready to communicate
     ↓
'disconnected' → Lost connection (may recover)
     ↓
'failed'       → ❌ Failed to connect (retry)
     ↓
'closed'       → Closed by user
```

---

## Media Constraints

### Video Constraints
```javascript
{
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}
```

### Audio Constraints
```javascript
{
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false
}
```

---

## Network Requirements

### For Direct Connection (Ideal)
- ✅ Both users on same network
- ✅ No restrictive firewall
- ✅ Public/open NAT

### Requires TURN Server
- ❌ Symmetric NAT (most corporate networks)
- ❌ Strict firewall
- ❌ Mobile carrier NAT

```
STUN Example:
Alice ←→ STUN Server (discovers IP)
Alice ←──────────────────────────► Bob
         (direct connection)

TURN Example (when direct fails):
Alice ←─► TURN Server ←─► Bob
    (relayed)
```

---

## Browser APIs Used

| API | Purpose |
|-----|---------|
| `RTCPeerConnection` | Main connection object |
| `getUserMedia()` | Access camera/microphone |
| `createOffer()` | Create SDP offer |
| `createAnswer()` | Create SDP answer |
| `setLocalDescription()` | Set our SDP |
| `setRemoteDescription()` | Set peer's SDP |
| `addIceCandidate()` | Add network path |
| `addTrack()` | Add audio/video track |
| `MediaStream` | Audio/video stream |
| `RTCSessionDescription` | SDP wrapper |
| `RTCIceCandidate` | Network address |

---

## Performance Metrics

Once connected, you can monitor:

```javascript
peerConnection.getStats().then(stats => {
  stats.forEach(report => {
    console.log(report.type);
    // 'inbound-rtp'  - incoming audio/video quality
    // 'outbound-rtp' - outgoing quality
    // 'candidate-pair' - connection quality
    // 'certificate' - encryption info
  });
});
```

---

## Security Features

✅ **Encrypted by Default**
- All WebRTC connections use DTLS (TLS over UDP)
- Media encrypted with SRTP
- Perfect Forward Secrecy (PFS)

✅ **No Third-Party Access**
- Only you and recipient can see media
- Server cannot intercept

✅ **Permission-Based**
- Browser prompts for camera/mic access
- User controls what apps access

---

## Debugging

### Check Connection State
```javascript
console.log('Connection:', peerConnection.connectionState);
console.log('Signaling:', peerConnection.signalingState);
console.log('ICE:', peerConnection.iceConnectionState);
```

### Monitor Data Flow
```javascript
peerConnection.onicecandidate = (e) => {
  console.log('ICE candidate:', e.candidate);
};

peerConnection.ontrack = (e) => {
  console.log('Received track:', e.track.kind);
};
```

### Check Browser Console
- Go to DevTools → Console
- Look for WebRTC errors
- Check WebSocket messages under Network tab

---

## Summary

```
WebRTC = Peer-to-Peer Real-Time Communication

✅ Direct connection (no server relay)
✅ Low latency (no middle servers)
✅ Encrypted by default
✅ Secure (only you can see media)
✅ Works on all modern browsers

🎬 Video Call = All of above + Camera
🎙️ Audio Call = All of above + Microphone

Your Wimpex now supports both! 🚀
```

