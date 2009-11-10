# WebRTC Implementation Guide for Wimpex

## Overview
WebRTC enables peer-to-peer real-time communication (audio/video). Your Wimpex already has WebSocket infrastructure for signaling—we just need to add the WebRTC peer connection logic.

---

## 1. How WebRTC Works

```
User A                    Signal Server (WebSocket)                    User B
  |                              |                                       |
  |-----(1) Create offer-------->|                                       |
  |                              |------(2) Send offer to User B-------->|
  |                              |                                       |
  |                              |<-----(3) Send answer back from B------|
  |<-----(4) Receive answer------|                                       |
  |                              |                                       |
  |(5) Exchange ICE candidates via WebSocket                             |
  |<--------------------------------------------------------- Direct P2P Connection
  |            (Audio/Video streams flow directly)                       |
```

### Key Concepts:
- **Signaling**: Exchange SDP offer/answer & ICE candidates via WebSocket ✅ (already have this)
- **ICE Candidates**: Network addresses for connecting peers
- **SDP**: Session Description Protocol (describes media capabilities)
- **PeerConnection**: The actual connection object

---

## 2. Client-Side Implementation

### Add these functions to `client/app.js`:

```javascript
// ===== WebRTC Configuration =====
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCallId = null;
let callInProgress = false;

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] }
  ]
};

// Create PeerConnection with ICE servers
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(ICE_SERVERS);
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // Send ICE candidate to peer via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          toId: window.currentOtherId,
          candidate: event.candidate
        }));
      }
    }
  };
  
  // Handle remote stream
  peerConnection.ontrack = (event) => {
    console.log('📺 Received remote stream:', event.streams[0]);
    remoteStream = event.streams[0];
    displayRemoteVideo(remoteStream);
  };
  
  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    if (peerConnection.connectionState === 'disconnected' || 
        peerConnection.connectionState === 'failed' || 
        peerConnection.connectionState === 'closed') {
      endCall();
    }
  };
  
  return peerConnection;
}

// Start local audio/video
async function getLocalStream(audioOnly = false) {
  try {
    const constraints = audioOnly ? 
      { audio: true, video: false } : 
      { audio: true, video: { width: 1280, height: 720 } };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Add local tracks to peer connection
    if (peerConnection) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    return localStream;
  } catch (err) {
    console.error('Error accessing media:', err);
    alert('Camera/microphone access denied');
    throw err;
  }
}

// Initiate video call
async function initiateVideoCall() {
  if (callInProgress) return alert('Call already in progress');
  if (!window.currentOtherId) return alert('Open a chat first');
  
  try {
    callInProgress = true;
    currentCallId = 'call_' + Date.now();
    
    // Get local stream
    await getLocalStream(false); // video + audio
    
    // Create peer connection
    createPeerConnection();
    
    // Create and send offer
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await peerConnection.setLocalDescription(offer);
    
    // Send offer via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call-offer',
        toId: window.currentOtherId,
        callId: currentCallId,
        offer: offer,
        callType: 'video',
        fromUsername: currentUser.username
      }));
    }
    
    // Show call UI
    showCallUI('outgoing', 'video');
    alert(`📹 Video call initiated with ${window.currentOtherUsername}...`);
    
  } catch (err) {
    console.error('Error initiating call:', err);
    callInProgress = false;
    alert('Error initiating call: ' + err.message);
  }
}

// Initiate audio call
async function initiateAudioCall() {
  if (callInProgress) return alert('Call already in progress');
  if (!window.currentOtherId) return alert('Open a chat first');
  
  try {
    callInProgress = true;
    currentCallId = 'call_' + Date.now();
    
    // Get local stream (audio only)
    await getLocalStream(true); // audio only
    
    // Create peer connection
    createPeerConnection();
    
    // Create and send offer
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    
    await peerConnection.setLocalDescription(offer);
    
    // Send offer via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call-offer',
        toId: window.currentOtherId,
        callId: currentCallId,
        offer: offer,
        callType: 'audio',
        fromUsername: currentUser.username
      }));
    }
    
    // Show call UI
    showCallUI('outgoing', 'audio');
    alert(`☎️ Audio call initiated with ${window.currentOtherUsername}...`);
    
  } catch (err) {
    console.error('Error initiating call:', err);
    callInProgress = false;
    alert('Error initiating call: ' + err.message);
  }
}

// Handle incoming call offer
async function handleCallOffer(fromId, fromUsername, callId, offer, callType) {
  try {
    const accepted = confirm(`📞 ${fromUsername} is calling you (${callType}).\n\nAccept call?`);
    
    if (!accepted) {
      // Decline call
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call-reject',
          toId: fromId,
          callId: callId
        }));
      }
      return;
    }
    
    // Get local stream
    await getLocalStream(callType === 'video');
    
    // Create peer connection
    createPeerConnection();
    
    // Set remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Create and send answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call-answer',
        toId: fromId,
        callId: callId,
        answer: answer
      }));
    }
    
    // Show call UI
    showCallUI('incoming', callType);
    
  } catch (err) {
    console.error('Error handling call offer:', err);
    alert('Error accepting call: ' + err.message);
  }
}

// Handle incoming call answer
async function handleCallAnswer(fromId, callId, answer) {
  try {
    if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  } catch (err) {
    console.error('Error handling call answer:', err);
  }
}

// Handle ICE candidates
async function handleIceCandidate(fromId, candidate) {
  try {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (err) {
    console.error('Error adding ICE candidate:', err);
  }
}

// End call
function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  remoteStream = null;
  callInProgress = false;
  currentCallId = null;
  
  hideCallUI();
  alert('📞 Call ended');
}

// Display remote video
function displayRemoteVideo(stream) {
  // Create or update video element for remote stream
  let remoteVideoEl = document.getElementById('remoteVideo');
  if (!remoteVideoEl) {
    remoteVideoEl = document.createElement('video');
    remoteVideoEl.id = 'remoteVideo';
    remoteVideoEl.autoplay = true;
    remoteVideoEl.playsinline = true;
    remoteVideoEl.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    document.body.appendChild(remoteVideoEl);
  }
  remoteVideoEl.srcObject = stream;
}

// Show call UI
function showCallUI(direction, callType) {
  let callModal = document.getElementById('callModal');
  if (!callModal) {
    callModal = document.createElement('div');
    callModal.id = 'callModal';
    callModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 3000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      color: #d4af37;
    `;
    callModal.innerHTML = `
      <div id="callTitle" style="font-size: 28px; font-weight: bold;"></div>
      <div id="callTimer" style="font-size: 32px; font-weight: bold;">00:00</div>
      <video id="localVideo" autoplay muted playsinline style="width:200px;height:150px;border-radius:12px;border:3px solid #d4af37;"></video>
      <div style="display:flex;gap:16px;">
        <button id="endCallBtn" style="padding:12px 24px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;">📞 End Call</button>
      </div>
    `;
    document.body.appendChild(callModal);
    
    document.getElementById('endCallBtn').addEventListener('click', endCall);
  }
  
  callModal.style.display = 'flex';
  document.getElementById('callTitle').textContent = 
    direction === 'outgoing' ? 
    `📤 Calling ${window.currentOtherUsername} (${callType})` :
    `📥 In call with ${window.currentOtherUsername} (${callType})`;
  
  // Display local video
  const localVideoEl = document.getElementById('localVideo');
  if (localStream && localVideoEl) {
    localVideoEl.srcObject = localStream;
  }
  
  // Start timer
  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('callTimer').textContent = 
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
  
  callModal.dataset.timerInterval = timerInterval;
}

// Hide call UI
function hideCallUI() {
  const callModal = document.getElementById('callModal');
  if (callModal) {
    clearInterval(parseInt(callModal.dataset.timerInterval));
    callModal.style.display = 'none';
  }
}
```

---

## 3. Update WebSocket Handlers

In your `connectWebSocket()` function, add these handlers:

```javascript
// In connectWebSocket() function's ws.addEventListener('message', ...)

if (msg.type === 'call-offer') {
  handleCallOffer(msg.from, msg.fromUsername, msg.callId, msg.offer, msg.callType);
}

if (msg.type === 'call-answer') {
  handleCallAnswer(msg.from, msg.callId, msg.answer);
}

if (msg.type === 'ice-candidate') {
  handleIceCandidate(msg.from, msg.candidate);
}

if (msg.type === 'call-reject') {
  callInProgress = false;
  alert(`📞 ${msg.fromUsername || 'User'} declined the call`);
}
```

---

## 4. Server-Side WebSocket Updates

The WebSocket signaling is already working! But verify these message types are forwarded:

**In `server/services/websocket.js`, in the message handler:**

```javascript
if (type === 'call-offer' || type === 'call-answer' || type === 'ice-candidate' || type === 'call-reject') {
  const { toId, data } = msg;
  const targetWs = connections.get(toId);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    targetWs.send(JSON.stringify({ ...msg, from: userId }));
  }
}
```

---

## 5. STUN/TURN Servers

For better connectivity (especially on mobile or behind NAT):

```javascript
const ICE_SERVERS = {
  iceServers: [
    // Free STUN servers
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] },
    
    // Optional: TURN server for relay (use with authentication)
    // { urls: ['turn:your-turn-server.com'], username: 'user', credential: 'pass' }
  ]
};
```

---

## 6. Testing WebRTC

### Local Testing:
1. Open app in two browser windows/tabs
2. Login different users in each
3. Go to chat with the other user
4. Click **📹** (video call) or **☎️** (audio call)
5. Accept the call when prompted

### Mobile Testing:
- Use **https** (WebRTC requires secure context)
- Test on actual devices (emulators may have issues)

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Camera/mic access denied" | Check browser permissions, use HTTPS |
| "No connection" | Check ICE candidates, use TURN server |
| "One-way audio/video" | Ensure both peers added tracks to connection |
| "Freezing" | Reduce video resolution, check bandwidth |

---

## 8. Advanced: Production Ready

For production, add:
1. **TURN Server** - For NAT traversal (use Coturn or cloud provider)
2. **Call Database** - Store call history
3. **Audio/Video Codecs** - Control quality
4. **Data Channel** - For file transfer
5. **Screen Sharing** - Add `getDisplayMedia()`

---

## Quick Reference

```javascript
// Start video call
initiateVideoCall();

// Start audio call
initiateAudioCall();

// End call
endCall();

// Check call status
console.log(peerConnection.connectionState); // 'connected', 'failed', etc
```

---

Done! Your Wimpex now has full WebRTC capabilities. 🚀
