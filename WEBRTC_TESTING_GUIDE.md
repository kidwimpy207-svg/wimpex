# WebRTC Testing Guide - Wimpex

## ✅ Pre-Test Checklist

Before testing WebRTC calls, ensure:

- [ ] Server is running: `npm start` in `server/` folder
- [ ] Browser supports WebRTC (Chrome, Firefox, Safari, Edge)
- [ ] Camera and microphone are connected and working
- [ ] Browser permissions granted for camera/mic
- [ ] Two user accounts created in your Wimpex app
- [ ] Both users can access the app at same time

---

## Test Setup

### **Option 1: Two Browser Tabs (Easiest)**

1. Open Wimpex in Tab 1: `http://localhost:3000`
2. Open Wimpex in Tab 2: `http://localhost:3000`
3. Login as **Alice** in Tab 1
4. Login as **Bob** in Tab 2
5. Go to chat view in both tabs
6. Alice opens chat with Bob (click Bob's name)
7. Bob opens chat with Alice (click Alice's name)

### **Option 2: Two Browser Windows**

Same steps as above, but use separate browser windows instead of tabs.

### **Option 3: Two Devices (Mobile + Desktop)**

1. Get your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Look for IPv4 address (e.g., `192.168.1.100`)

2. Run server accessible from other device:
   ```bash
   # In server folder
   npm start
   # Should show: 🌟 Wimpex server running on http://0.0.0.0:3000
   ```

3. On desktop: Go to `http://localhost:3000`
4. On mobile: Go to `http://192.168.1.100:3000`
5. Login with different accounts on each device
6. Start a call between them

---

## Test Scenario 1: Video Call (Basic)

### **Steps:**

#### Tab 1 (Alice):
1. Login as Alice
2. Click **💬** (Messages tab)
3. Click **+ New Chat**
4. Search for "Bob"
5. Click Bob to open chat
6. **Click 📹 button** (video call)

#### Tab 2 (Bob):
7. Wait for call prompt: `📞 Alice is calling you (video). Accept call?`
8. Click **OK** to accept

#### Both:
9. ✅ See call screen with:
   - Your own video in small box
   - Timer counting up (00:00 → 00:01 → ...)
   - **📞 End Call** button
10. Click **📞 End Call** to finish

### **Expected Results:**
- ✅ Call connects within 2-3 seconds
- ✅ Both see video (may take 1-2 sec to display)
- ✅ No lag/freezing
- ✅ Call ends cleanly

---

## Test Scenario 2: Audio Call

### **Steps:**

#### Tab 1 (Alice):
1. Open chat with Bob
2. **Click ☎️ button** (audio call)

#### Tab 2 (Bob):
3. Accept call prompt

#### Both:
4. Audio call active (no video)
5. Click **End Call**

### **Expected Results:**
- ✅ Audio call connects
- ✅ Can hear each other
- ✅ No video (audio only)

---

## Test Scenario 3: Reject Call

### **Steps:**

#### Tab 1 (Alice):
1. Click 📹 or ☎️ to call Bob

#### Tab 2 (Bob):
2. See call prompt
3. **Click Cancel** (or nothing)

#### Tab 1 (Alice):
4. Alert: `📞 Call declined by recipient`

### **Expected Results:**
- ✅ Alice sees rejection message
- ✅ No connection attempt
- ✅ Back to chat view

---

## Test Scenario 4: Consecutive Calls

### **Steps:**

#### First Call:
1. Alice calls Bob
2. Bob accepts
3. Both chat via video
4. Click End Call

#### Second Call:
5. Bob calls Alice
6. Alice accepts
7. Both chat
8. End Call

### **Expected Results:**
- ✅ First call works
- ✅ Second call works
- ✅ No residual connection issues

---

## Test Scenario 5: No Chat Selected

### **Steps:**

#### Tab 1 (Alice):
1. In Messages view but NOT in any chat
2. Click 📹 or ☎️

### **Expected Results:**
- ✅ Alert: `Open a chat first`
- ✅ No call initiated

---

## Troubleshooting During Test

### ❌ "Camera/microphone access denied"

**Solution:**
1. Go to browser settings (top right menu)
2. Find "Settings"
3. Go to "Privacy and security"
4. Find "Camera" and "Microphone"
5. Click localhost:3000 → Allow

**Or:**
- Refresh page and grant permission when prompted

### ❌ "Connection failed" or "No connection"

**Check:**
```javascript
// Open browser console (F12)
// Check WebSocket connection
console.log('WS open?', ws.readyState === 1); // Should be true

// Check if message sent
// In Network tab, see WebSocket messages
```

**Solution:**
- Check server is running: `npm start`
- Refresh browser page
- Close all browser tabs and re-login

### ❌ "I can see them but they can't see me"

**Cause:** One-way video connection

**Solution:**
- Refresh both pages
- End call and call again
- Check browser console for errors

### ❌ "Call hangs on 'Calling...'"

**Check:**
1. Is WebSocket connected? (Check console)
2. Is server forwarding messages? (Check server logs)

**Solution:**
- Restart server: Press Ctrl+C, then `npm start`
- Refresh both browser tabs

### ❌ "Audio/Video lags or freezes"

**Cause:** Network congestion or low bandwidth

**Solution:**
- Test on same WiFi network first
- Close other apps using network
- Reduce video quality (auto-adjusts)
- Test again

---

## What to Check in Browser Console

Open DevTools: **F12** → **Console**

### Check WebSocket
```javascript
// Should output "1" (OPEN)
console.log('WebSocket ready:', ws.readyState);

// Test sending message
ws.send(JSON.stringify({
  type: 'test',
  toId: 'user123'
}));
```

### Check PeerConnection
```javascript
// During call
console.log('Peer state:', peerConnection?.connectionState);
// Should be: new → connecting → connected

console.log('Signaling state:', peerConnection?.signalingState);
// Should be: stable
```

### Check Streams
```javascript
// During call
console.log('Local stream:', localStream?.getTracks());
console.log('Remote stream:', remoteStream?.getTracks());
```

---

## Network Tab Testing

To debug WebSocket messages:

1. Open DevTools: **F12**
2. Go to **Network** tab
3. Filter by **WS** (WebSocket)
4. Look for WebSocket connection
5. Click it → **Messages** sub-tab
6. See all messages sent/received:

```
[ → Server ] call-offer
[ → Server ] ice-candidate
[ → Server ] ice-candidate
[ ← Server ] call-answer
```

---

## Performance Monitoring

During a call, check quality:

```javascript
// In browser console (during call)

// Get stats every 2 seconds
setInterval(async () => {
  const stats = await peerConnection.getStats();
  stats.forEach(report => {
    if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
      console.log('Send bitrate:', Math.round(report.bytesSent / 1000), 'KB');
      console.log('FPS:', report.framesPerSecond);
    }
  });
}, 2000);
```

**Healthy values:**
- FPS: 24-30
- Bitrate: 500-2000 KB/s
- No packet loss

---

## Test Report Template

```
WebRTC Test Report
==================

Date: ___________
Tester: ___________

Environment:
[ ] Chrome [ ] Firefox [ ] Safari [ ] Edge
[ ] Desktop [ ] Mobile
[ ] Same Network [ ] Different Networks

Test Cases:
-----------

1. Video Call (Basic)
   [ ] Alice calls Bob
   [ ] Bob accepts
   [ ] Both see video
   [ ] Call ends cleanly
   Notes: ___________

2. Audio Call
   [ ] Call connects
   [ ] Audio works
   [ ] No video shown
   Notes: ___________

3. Multiple Calls
   [ ] First call works
   [ ] Second call works
   [ ] No connection issues
   Notes: ___________

4. Permission Handling
   [ ] Browser asks for camera
   [ ] Browser asks for mic
   [ ] Can grant/deny
   Notes: ___________

5. Error Handling
   [ ] Rejection shows alert
   [ ] No chat selected shows alert
   [ ] Network error handled
   Notes: ___________

Issues Found:
-----------
1. ___________
2. ___________
3. ___________

Overall: [ ] PASS [ ] FAIL

Signature: ___________ Date: ___________
```

---

## Production Testing Checklist

Before deploying, test:

- [ ] HTTPS enabled (WebRTC requires secure context)
- [ ] TURN server configured (if behind NAT)
- [ ] Multiple concurrent calls
- [ ] Call history saved to database
- [ ] Mobile browser support
- [ ] Network failover (switch WiFi during call)
- [ ] Recording feature (if added)
- [ ] Screen sharing (if added)

---

## Next Steps After Testing

If all tests pass:

1. ✅ Deploy to production
2. ✅ Add call history logging
3. ✅ Add call analytics
4. ✅ Implement TURN server
5. ✅ Add screen sharing
6. ✅ Add call recording

---

## Quick Test Command

Run this in browser console to auto-test:

```javascript
// ⚠️ Only for testing in same browser window!

async function autoTest() {
  console.log('🧪 WebRTC Auto-Test Started');
  
  // Test 1: Check WebSocket
  console.log('✓ WebSocket state:', ws?.readyState === 1 ? 'OPEN' : 'CLOSED');
  
  // Test 2: Check camera permission
  try {
    await navigator.mediaDevices.enumerateDevices();
    console.log('✓ Camera/Mic access available');
  } catch(e) {
    console.log('✗ No device access:', e.message);
  }
  
  // Test 3: Check PeerConnection API
  if (window.RTCPeerConnection) {
    console.log('✓ RTCPeerConnection supported');
  } else {
    console.log('✗ WebRTC not supported');
  }
  
  // Test 4: Check current chat
  if (window.currentOtherId) {
    console.log('✓ Chat open with:', window.currentOtherUsername);
  } else {
    console.log('⚠ No chat selected');
  }
  
  console.log('🧪 Tests complete!');
}

autoTest();
```

---

## Summary

✅ **Your Wimpex is ready for WebRTC testing!**

1. Start with **two browser tabs** on same computer
2. Login as different users
3. Open chat between them
4. Click **📹** or **☎️** to call
5. Check browser console for any errors
6. Monitor Network tab for WebSocket messages
7. Test both **accept** and **reject** scenarios

**If all tests pass:** Your video/audio calling is working! 🎉

