(function() {
  // ===== STATE =====
  let currentUser = null;
  let currentUserId = null;
  let currentToken = null;
  let isAdmin = false;
  let ws = null;
  let wsQueue = [];
  let currentFilter = 'none';
  let localStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let conversations = new Map();
  // Generate a reasonably-unique message id for client-side messages
  function generateMessageId() {
    return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9);
  }
  let temp2FAToken = null;
  
  // API Configuration
  const API_PREFIX = '/api';

  // Global fetch wrapper: automatically attach auth token and handle 401/403
  (function() {
    const _origFetch = window.fetch.bind(window);
    window.fetch = async function(input, init = {}) {
      init = init || {};
      init.headers = init.headers || {};

        // Sanitize any explicitly-set Authorization header that may be `Bearer null` or `Bearer undefined`
        if (init.headers) {
          try {
            const a = init.headers.authorization || init.headers.Authorization || '';
            if (typeof a === 'string' && (/Bearer\s+(null|undefined)/i).test(a.trim())) {
              delete init.headers.authorization;
              delete init.headers.Authorization;
            }
          } catch (e) {}
        }

        // If no auth header present, attach current token
        if (!init.headers.authorization && !init.headers.Authorization && currentToken) {
          init.headers.authorization = `Bearer ${currentToken}`;
        }

      const res = await _origFetch(input, init);

      if (res.status === 401 || res.status === 403) {
        try {
          const body = await res.clone().json().catch(() => null);
          console.warn('API auth error', res.status, body);
        } catch (e) {
          console.warn('API auth error', res.status);
        }

        try { clearSession(); } catch (e) {}
        try { if (authContainer) authContainer.style.display = 'block'; } catch (e) {}
      }

      return res;
    };
  })();

  // ===== DOM ELEMENTS =====
  const authContainer = document.getElementById('authContainer');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const authTabs = document.querySelectorAll('.tab-btn');
  const authError = document.getElementById('authError');

  const sidebar = document.querySelector('.sidebar');
  const mainContainer = document.querySelector('.main-container');
  const logoutBtn = document.getElementById('logoutBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  const storiesBtn = document.getElementById('storiesBtn');
  const chatsBtn = document.getElementById('chatsBtn');
  const callsBtn = document.getElementById('callsBtn');
  const cameraBtn = document.getElementById('cameraBtn');
  const profileBtn = document.getElementById('profileBtn');

  const storiesView = document.getElementById('storiesView');
  const chatsView = document.getElementById('chatsView');
  const callsView = document.getElementById('callsView');
  const cameraView = document.getElementById('cameraView');
  const profileView = document.getElementById('profileView');
  const settingsView = document.getElementById('settingsView');
  const recommendationsView = document.getElementById('recommendationsView');
  const wimpyBtn = document.getElementById('wimpyBtn');
  const wimpyView = document.getElementById('wimpyView');
  const wimpyMessagesLog = document.getElementById('wimpyMessagesLog');
  const wimpyForm = document.getElementById('wimpyForm');
  const wimpyInput = document.getElementById('wimpyInput');
  const wimpyConversationsList = document.getElementById('wimpyConversationsList');
  const wimpyRefreshBtn = document.getElementById('wimpyRefreshBtn');
  const wimpyNewBtn = document.getElementById('wimpyNewBtn');
  const wimpyAttachBtn = document.getElementById('wimpyAttachBtn');
  const wimpyMediaInput = document.getElementById('wimpyMediaInput');
  const imageEditorModal = document.getElementById('imageEditorModal');
  const imageEditorCanvas = document.getElementById('imageEditorCanvas');
  const editorRotateBtn = document.getElementById('editorRotateBtn');
  const editorCropSquareBtn = document.getElementById('editorCropSquareBtn');
  const editorSaveBtn = document.getElementById('editorSaveBtn');
  const editorCancelBtn = document.getElementById('editorCancelBtn');

  const storiesGrid = document.getElementById('storiesGrid');
  const newStoryBtn = document.getElementById('newStoryBtn');

  const chatsList = document.getElementById('chatsList');
  const callsList = document.getElementById('callsList');
  const chatDetail = document.getElementById('chatDetail');
  const chatName = document.getElementById('chatName');
  const avatarModal = document.getElementById('avatarModal');
  const avatarModalImg = document.getElementById('avatarModalImg');
  const messagesLog = document.getElementById('messagesLog');
  const newMessageIndicator = document.getElementById('newMessageIndicator');
  const newMessageCountEl = document.getElementById('newMessageCount');
  const pinScrollBtn = document.getElementById('pinScrollBtn');

  // Auto-scroll configuration
  let unseenCount = 0;
  const SCROLL_THRESHOLD = 80; // px - smaller threshold for auto-scroll
  let pinScrollEnabled = true; // DEFAULT: enable auto-scroll to bottom
  try { pinScrollEnabled = localStorage.getItem('pinScrollEnabled') !== 'false'; } catch (e) { pinScrollEnabled = true; }
  if (pinScrollBtn) pinScrollBtn.setAttribute('aria-pressed', pinScrollEnabled ? 'true' : 'false');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const backToChats = document.getElementById('backToChats');
  const newChatBtn = document.getElementById('newChatBtn');

  const cameraStream = document.getElementById('cameraStream');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const snapBtn = document.getElementById('snapBtn');
  const recordBtn = document.getElementById('recordBtn');
  const swapCameraBtn = document.getElementById('swapCameraBtn');
  const snapCanvas = document.getElementById('snapCanvas');
  const snapPreview = document.getElementById('snapPreview');
  const snapImage = document.getElementById('snapImage');
  const snapRecipient = document.getElementById('snapRecipient');
  const resnapBtn = document.getElementById('resnapBtn');
  const sendSnapBtn = document.getElementById('sendSnapBtn');
  const snapCaption = document.getElementById('snapCaption');
  const openMusicPickerBtn = document.getElementById('openMusicPickerBtn');
  const selectedMusicInput = document.getElementById('selectedMusic');
  const snapAudioInput = document.getElementById('snapAudioInput');
  const attachAudioBtn = document.getElementById('attachAudioBtn');
  const selectedMusicDisplay = document.getElementById('selectedMusicDisplay');
  const musicPickerModal = document.getElementById('musicPickerModal');
  const musicList = document.getElementById('musicList');
  const closeMusicPicker = document.getElementById('closeMusicPicker');
  let musicPreviewAudio = null;
  const musicSearchInput = document.getElementById('musicSearchInput');
  const musicSearchBtn = document.getElementById('musicSearchBtn');
  const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');

  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileBio = document.getElementById('profileBio');
  const friendCount = document.getElementById('friendCount');
  const storyCount = document.getElementById('storyCount');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const shareProfileBtn = document.getElementById('shareProfileBtn');
  const spotifyConnectStatus = document.getElementById('spotifyConnectStatus');
  const spotifyConnectBtnHeader = document.getElementById('spotifyConnectBtn');

  const editProfileModal = document.getElementById('editProfileModal');
  const editProfileForm = document.getElementById('editProfileForm');
  const editBio = document.getElementById('editBio');
  const enable2faBtn = document.getElementById('enable2faBtn');
  const disable2faBtn = document.getElementById('disable2faBtn');
  const twoFaModal = document.getElementById('twoFaModal');
  const twoFaSetupArea = document.getElementById('twoFaSetupArea');
  const twoFaQr = document.getElementById('twoFaQr');
  const twoFaSecret = document.getElementById('twoFaSecret');
  const twoFaSetupCode = document.getElementById('twoFaSetupCode');
  const confirm2faBtn = document.getElementById('confirm2faBtn');
  const cancel2faBtn = document.getElementById('cancel2faBtn');
  const twoFaSetupStatus = document.getElementById('twoFaSetupStatus');
  const twoFaLoginArea = document.getElementById('twoFaLoginArea');
  const twoFaLoginCode = document.getElementById('twoFaLoginCode');
  const submit2faLoginBtn = document.getElementById('submit2faLoginBtn');
  const cancel2faLoginBtn = document.getElementById('cancel2faLoginBtn');
  const twoFaLoginStatus = document.getElementById('twoFaLoginStatus');

  // Onboarding elements
  const onboardingModal = document.getElementById('onboardingModal');
  const onboardingStep1 = document.getElementById('onboardingStep1');
  const onboardingStep2 = document.getElementById('onboardingStep2');
  const onboardingStep3 = document.getElementById('onboardingStep3');
  const onboardingNext1 = document.getElementById('onboardingNext1');
  const onboardingNext2 = document.getElementById('onboardingNext2');
  const onboardingFinish = document.getElementById('onboardingFinish');
  const onboardingSkip = document.getElementById('onboardingSkip');
  const onboardingStatus = document.getElementById('onboardingStatus');

  // ===== STORAGE =====
  function saveSession() {
    localStorage.setItem('wimpex_token', currentToken);
    localStorage.setItem('wimpex_user', JSON.stringify(currentUser));
    localStorage.setItem('wimpex_userId', currentUserId);
    localStorage.setItem('wimpex_isAdmin', isAdmin);
    console.log('[Session] Saved to localStorage:', { token: currentToken?.slice(0,10), userId: currentUserId, username: currentUser?.username });
  }

  function loadSession() {
    const token = localStorage.getItem('wimpex_token');
    const user = JSON.parse(localStorage.getItem('wimpex_user') || 'null');
    const userId = localStorage.getItem('wimpex_userId');
    const admin = localStorage.getItem('wimpex_isAdmin') === 'true';
    console.log('[Session] Loaded from localStorage:', { token: token?.slice(0,10), userId, username: user?.username, admin });
    if (token && user && userId) {
      currentToken = token;
      currentUser = user;
      currentUserId = userId;
      isAdmin = admin;
      console.log('[Session] ✅ User logged in from saved session:', user.username);
      return true;
    }
    console.log('[Session] localStorage incomplete, user not logged in');
    return false;
  }

  function clearSession() {
    localStorage.removeItem('wimpex_token');
    localStorage.removeItem('wimpex_user');
    localStorage.removeItem('wimpex_userId');
    localStorage.removeItem('wimpex_isAdmin');
    currentUser = null;
    currentUserId = null;
    currentToken = null;
    isAdmin = false;
  }

  // ===== AUTH TABS =====
  authTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      authTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else if (tab === 'signup') {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
      }
      authError.classList.add('hidden');
    });
  });

  // ===== FORGOT PASSWORD =====
  const forgotLink = document.getElementById('forgotLink');
  const forgotModal = document.getElementById('forgotModal');
  const forgotEmail = document.getElementById('forgotEmail');
  const sendForgotBtn = document.getElementById('sendForgotBtn');
  const cancelForgotBtn = document.getElementById('cancelForgotBtn');
  const forgotStatus = document.getElementById('forgotStatus');

  // Email verification modal elements
  const verifyModal = document.getElementById('verifyModal');
  const verifyTokenInput = document.getElementById('verifyTokenInput');
  const verifyTokenBtn = document.getElementById('verifyTokenBtn');
  const resendVerifyBtn = document.getElementById('resendVerifyBtn');
  const closeVerifyBtn = document.getElementById('closeVerifyBtn');
  const verifyStatus = document.getElementById('verifyStatus');

  if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); forgotModal.classList.remove('hidden'); });
  if (cancelForgotBtn) cancelForgotBtn.addEventListener('click', () => { forgotModal.classList.add('hidden'); forgotStatus.textContent = ''; });

  if (sendForgotBtn) sendForgotBtn.addEventListener('click', async () => {
    const email = forgotEmail.value.trim();
    if (!email) return forgotStatus.textContent = 'Enter your email';
    forgotStatus.textContent = 'Sending...';
    try {
      const res = await fetch(`${API_PREFIX}/auth/forgot`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await res.json();
      forgotStatus.textContent = j.message || 'If that email exists we sent a reset link';
    } catch (e) {
      forgotStatus.textContent = 'Error sending reset link';
    }
  });

  // Verify modal helpers
  function showVerifyModal() {
    if (!verifyModal) return;
    verifyStatus.textContent = '';
    verifyTokenInput.value = '';
    verifyModal.classList.remove('hidden');
  }

  function hideVerifyModal() {
    if (!verifyModal) return;
    verifyModal.classList.add('hidden');
    verifyStatus.textContent = '';
  }

  if (closeVerifyBtn) closeVerifyBtn.addEventListener('click', () => hideVerifyModal());

  if (resendVerifyBtn) resendVerifyBtn.addEventListener('click', async () => {
    if (!currentToken) {
      verifyStatus.textContent = 'You must be signed in to resend verification.';
      return;
    }
    verifyStatus.textContent = 'Resending...';
    try {
      const res = await fetch(`${API_PREFIX}/email/send-verification`, { method: 'POST', headers: { 'authorization': `Bearer ${currentToken}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        verifyStatus.textContent = j.error || 'Failed to resend verification';
        return;
      }
      // If server returned a debug token (no SMTP), surface it to the user and autofill the verify input
      if (j.token) {
        verifyStatus.textContent = 'Verification token (dev): ' + j.token;
        verifyTokenInput.value = j.token;
        return;
      }
      verifyStatus.textContent = j.message || 'Verification email resent';
    } catch (e) {
      console.error('Resend verification error', e);
      verifyStatus.textContent = 'Network error';
    }
  });

  if (verifyTokenBtn) verifyTokenBtn.addEventListener('click', async () => {
    const token = (verifyTokenInput && verifyTokenInput.value || '').trim();
    if (!token) {
      verifyStatus.textContent = 'Paste the token here';
      return;
    }
    verifyStatus.textContent = 'Verifying...';
    try {
      const res = await fetch(`${API_PREFIX}/email/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        verifyStatus.textContent = j.error || 'Invalid or expired token';
        return;
      }
      verifyStatus.textContent = j.message || 'Email verified';
      // update local state
      if (currentUser) currentUser.emailConfirmed = true;
      saveSession();
      setTimeout(() => hideVerifyModal(), 900);
    } catch (e) {
      console.error('Verify token error', e);
      verifyStatus.textContent = 'Network error';
    }
  });

  // ===== LOGIN =====
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    
    const input = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginType = document.querySelector('input[name="loginType"]:checked').value;

    // Check for admin mode
    if (input === 'admin' && password === 'wimpykid') {
      currentUserId = 'admin_' + Date.now();
      currentUser = { 
        username: '👑 ADMIN', 
        avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23d4af37" width="100" height="100"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="%230a0e27">👑</text></svg>',
        bio: 'Wimpex Creator', 
        friends: [], 
        followers: [] 
      };
      currentToken = 'admin_token_' + Date.now();
      isAdmin = true;
      saveSession();
      onAuthSuccess();
      showAdminPanel();
      return;
    }

    try {
      const res = await fetch(`${API_PREFIX}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, password, loginType })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      if (data.need2FA) {
        temp2FAToken = data.tempToken;
        if (twoFaLoginArea) twoFaLoginArea.style.display = 'block';
        if (twoFaSetupArea) twoFaSetupArea.style.display = 'none';
        if (twoFaModal) twoFaModal.style.display = 'flex';
        if (twoFaLoginStatus) twoFaLoginStatus.textContent = '';
        return;
      }

      const { userId, username, avatar, token } = data;
      currentUserId = userId;
      currentUser = { username, avatar, bio: 'New to Wimpex ✨', friends: [], followers: [] };
      currentToken = token;
      isAdmin = false;

      saveSession();
      console.log('[Login] Success:', { userId, username, token: token?.slice(0,10) });
      onAuthSuccess();
      loadFriends();
    } catch (err) {
      console.error('[Login] Error:', err);
      authError.textContent = err.message;
      authError.classList.remove('hidden');
    }
  });

  // Fallback: ensure login button triggers submit even if event binding fails or UI overlay prevents normal submit
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn && loginForm) {
    loginBtn.addEventListener('click', (ev) => {
      // Use requestSubmit to fire submit handlers
      if (typeof loginForm.requestSubmit === 'function') {
        loginForm.requestSubmit();
      } else {
        // older fallback
        const evt = new Event('submit', { bubbles: true, cancelable: true });
        loginForm.dispatchEvent(evt);
      }
    });
  }

  // ===== SIGNUP =====
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');

    const username = document.getElementById('signupUsername').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;

    if (!gender) {
      authError.textContent = 'Please select a gender';
      authError.classList.remove('hidden');
      return;
    }

    if (password !== confirm) {
      authError.textContent = 'Passwords do not match';
      authError.classList.remove('hidden');
      return;
    }

    try {
      const res = await fetch(`${API_PREFIX}/auth/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password, gender })
      });

      // parse response once (avoid reading body twice)
      const text = await res.text();
      let payload = null;
      try { payload = JSON.parse(text || '{}'); } catch (e) { payload = { error: 'Invalid server response' }; }

      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Signup failed (${res.status})`;
        throw new Error(msg);
      }

      const { userId, avatar, token } = payload || {};
      currentUserId = userId;
      currentUser = { username, avatar, bio: 'New to Wimpex ✨', gender, friends: [], followers: [] };
      currentToken = token;
      isAdmin = false;

      saveSession();
      console.log('[Signup] Success:', { userId, username, token: token?.slice(0,10) });
      onAuthSuccess();
      await loadFriends();
      // Prompt the user to verify their email after signup
      try {
        showVerifyModal();
        // If server returned a debug token (no SMTP), auto-fill it for convenience
        if (payload && payload.debugEmailToken) {
          verifyStatus.textContent = 'Verification token (dev): ' + payload.debugEmailToken;
          verifyTokenInput.value = payload.debugEmailToken;
        }
      } catch (e) { console.warn('Show verify modal failed', e); }
    } catch (err) {
      console.error('[Signup] Error:', err);
      authError.textContent = err.message;
      authError.classList.remove('hidden');
    }
  });

  async function onAuthSuccess() {
    authContainer.style.display = 'none';
    sidebar.classList.remove('hidden');
    mainContainer.style.display = 'block';
    if (!isAdmin) connectWebSocket();
    updateProfile();
    if (!isAdmin) {
      await checkOnboarding();
      loadStories();
      loadChatsList();
      // If email isn't confirmed, prompt the user to verify
      try {
        if (currentUser && currentUser.emailConfirmed === false) {
          showVerifyModal();
        }
      } catch (e) { console.warn('verify prompt failed', e); }
    }
  }

  // Check onboarding status via settings and show modal if incomplete
  async function checkOnboarding() {
    try {
      const res = await fetch(`${API_PREFIX}/settings`, { headers: { 'authorization': `Bearer ${currentToken}` } });
      if (!res.ok) return;
      const user = await res.json();
      // update current user with latest server state
      currentUser = Object.assign({}, currentUser, user);
      saveSession();
      if (!user.onboardingComplete) {
        showOnboarding();
      }
    } catch (e) {
      console.warn('Onboarding check failed', e);
    }
  }

  function showOnboarding() {
    if (!onboardingModal) return;
    onboardingModal.style.display = 'flex';
    onboardingStep1 && (onboardingStep1.style.display = 'block');
    onboardingStep2 && (onboardingStep2.style.display = 'none');
    onboardingStep3 && (onboardingStep3.style.display = 'none');
    if (onboardingStatus) onboardingStatus.textContent = '';
  }

  function hideOnboarding() {
    if (!onboardingModal) return;
    onboardingModal.style.display = 'none';
  }

  if (onboardingNext1) onboardingNext1.addEventListener('click', () => {
    if (onboardingStep1) onboardingStep1.style.display = 'none';
    if (onboardingStep2) onboardingStep2.style.display = 'block';
  });

  if (onboardingNext2) onboardingNext2.addEventListener('click', () => {
    if (onboardingStep2) onboardingStep2.style.display = 'none';
    if (onboardingStep3) onboardingStep3.style.display = 'block';
  });

  async function completeOnboarding() {
    if (!currentToken) return;
    if (onboardingStatus) onboardingStatus.textContent = 'Saving...';
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST', headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' } });
      if (!res.ok) {
        const j = await res.json();
        if (onboardingStatus) onboardingStatus.textContent = j.error || 'Failed to save';
        return;
      }
      currentUser.onboardingComplete = true;
      saveSession();
      if (onboardingStatus) onboardingStatus.textContent = '';
      hideOnboarding();
      alert('Onboarding complete — enjoy Wimpex!');
    } catch (e) {
      console.error('Complete onboarding error', e);
      if (onboardingStatus) onboardingStatus.textContent = 'Network error';
    }
  }

  if (onboardingFinish) onboardingFinish.addEventListener('click', completeOnboarding);
  if (onboardingSkip) onboardingSkip.addEventListener('click', () => { hideOnboarding(); });

  // ===== ADMIN PANEL =====
  function showAdminPanel() {
    storiesView.innerHTML = `
      <div style="padding: 20px; color: #d4af37; text-align: center;">
        <h2>👑 ADMIN DASHBOARD 👑</h2>
        <p>Welcome, Wimpex Creator!</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #d4af37; color: #0a0e27; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Reset App</button>
        <div style="margin-top: 20px; padding: 20px; background: rgba(212, 175, 55, 0.1); border-radius: 8px;">
          <h3>Admin Stats</h3>
          <p>🔑 Admin Mode Active</p>
          <p>✨ Wimpex Status: Operational</p>
          <p>💾 Database: Persistent JSON</p>
          <p>🔐 Auth: JWT + Bcrypt</p>
        </div>
      </div>
    `;
  }

  // ===== LOGOUT =====
  logoutBtn.addEventListener('click', () => {
    clearSession();
    if (ws) ws.close();
    authContainer.style.display = 'flex';
    sidebar.classList.add('hidden');
    mainContainer.style.display = 'none';
    conversations.clear();
    const le = document.getElementById('loginEmail'); if (le) le.value = '';
    const lp = document.getElementById('loginPassword'); if (lp) lp.value = '';
    const su = document.getElementById('signupUsername'); if (su) su.value = '';
    const se = document.getElementById('signupEmail'); if (se) se.value = '';
    const sp = document.getElementById('signupPassword'); if (sp) sp.value = '';
    const sc = document.getElementById('signupConfirm'); if (sc) sc.value = '';
  });

  // ===== WEBSOCKET =====
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    // Wrapper to send or queue messages until the socket is open
    function sendWS(payload) {
      try {
        const body = (typeof payload === 'string') ? payload : JSON.stringify(payload);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(body);
        } else {
          wsQueue.push(body);
          console.debug('[ws] queued message, queueLength=', wsQueue.length);
        }
      } catch (e) { console.warn('[ws] send failed', e); }
    }

    // expose sendWS to other scopes
    window.sendWS = sendWS;

    ws.addEventListener('open', () => {
      // flush queued messages
      try {
        while (wsQueue.length) {
          const item = wsQueue.shift();
          ws.send(item);
        }
      } catch (e) { console.warn('[ws] flush failed', e); }
      // auth
      sendWS({ type: 'auth', token: currentToken });
      console.log('✨ Connected to Wimpex');
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.type === 'new-message') {
        // server may send { type:'new-message', message: { id, from, to, text, timestamp, type } }
        const m = msg.message || msg;
        const from = m.from || msg.from;
        const text = m.text || m.content || msg.text || '';
        const msgType = m.type || msg.msgType || msg.type;
        const mid = m.id || m.messageId || msg.id || null;
        const convoId = [currentUserId, from].sort().join('-');
        if (!conversations.has(convoId)) conversations.set(convoId, []);
        conversations.get(convoId).push({ from, text, time: m.timestamp || msg.time || Date.now() });
        const fromUsername = (msg.fromUsername || (m.from && (m.fromUsername || m.from)) || 'Unknown');
        appendMessage(fromUsername, msgType ? { type: msgType, content: text } : text, 'other', '', 'sent', mid);
        playNotification();
        
        // Show notification
        showNotification(`New message from ${fromUsername}`, {
          body: typeof text === 'string' ? text.substring(0, 100) : 'Sent a message'
        });
        
        // Update unread badge if not in current chat
        if (window.currentOtherId !== from) {
          updateUnreadBadge(from, 1);
        }
      }

      if (msg.type === 'snap-notification') {
        const { fromUsername, fromId } = msg;
        showNotification(`🔥 New snap from ${fromUsername}!`, {
          body: 'Open to view your snap'
        });
        updateUnreadBadge(fromId, 1);
      }

      if (msg.type === 'user-typing') {
        chatName.innerHTML = chatName.textContent.replace(' ✍️ typing...', '') + ' <span style="color:#d4af37">✍️ typing...</span>';
      }

      if (msg.type === 'delivered') {
        // { type: 'delivered', id, from, ts, clientId }
        const serverId = msg.id || msg.messageId;
        const clientId = msg.clientId || null;
        // If server echoed back clientId, find optimistic element by that id and reconcile
        if (clientId) {
          const elLocal = document.querySelector(`[data-message-id="${clientId}"]`);
          if (elLocal) {
            // reassign DOM id to server id for future receipts
            elLocal.dataset.messageId = serverId;
            updateMessageStatus(elLocal, 'delivered');
          }
        }
        // fallback: try to update by server id
        if (serverId) {
          const el = document.querySelector(`[data-message-id="${serverId}"]`);
          if (el) updateMessageStatus(el, 'delivered');
        }
      }

      if (msg.type === 'read') {
        // { type: 'read', ids: [id,...], from, ts }
        const ids = msg.ids || (msg.id ? [msg.id] : []);
        if (Array.isArray(ids) && ids.length) {
          ids.forEach(id => {
            const el = document.querySelector(`[data-message-id="${id}"]`);
            if (el) updateMessageStatus(el, 'seen');
          });
        }
      }

      if (msg.type === 'message-deleted') {
        try {
          const { conversationId, messageId, scope } = msg;
          const currentConvo = window.currentOtherId ? [window.currentOtherId, currentUserId].sort().join('-') : null;
          // If this deletion applies to the open conversation, update UI
          if (currentConvo && conversationId === currentConvo) {
            const el = document.querySelector(`[data-message-id="${messageId}"]`);
            if (el) {
              if (scope === 'all') el.remove();
              else {
                const content = el.querySelector('.content');
                if (content) content.innerHTML = '<em style="color:var(--muted)">Message deleted</em>';
              }
            }
          } else {
            // If not open, optionally update conversation preview badge
            // (best-effort) mark conversation as having an update
            console.debug('[ws] message-deleted for conversation', conversationId, messageId, scope);
          }
        } catch (e) { console.warn('handle message-deleted failed', e); }
      }

      // WebRTC signaling
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
        alert(`📞 Call declined by recipient`);
      }
    });

    ws.addEventListener('close', () => {
      if (!isAdmin) setTimeout(connectWebSocket, 3000);
    });
  }

    // ===== Chat helpers: append messages, status updates, paste handling, read receipts =====
    function createStatusEl(status) {
      const s = document.createElement('span');
      s.className = 'message-status ' + (status ? 'status-' + status : '');
      s.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="status-text">${status || ''}</span>`;
      return s;
    }

    function updateMessageStatus(messageEl, status) {
      if (!messageEl) return;
      messageEl.dataset.messageStatus = status;
      let s = messageEl.querySelector('.message-status');
      if (!s) { s = createStatusEl(status); messageEl.appendChild(s); }
      s.className = 'message-status status-' + status;
      const txt = s.querySelector('.status-text'); if (txt) txt.textContent = status === 'seen' ? 'Seen' : (status === 'delivered' ? 'Delivered' : (status === 'sent' ? 'Sent' : (status === 'sending' ? 'Sending' : status)));
      // update chat header small indicator when this is own message
      try {
        if (messageEl.classList.contains('own')) setChatLastStatus(status);
      } catch (e) {}
    }

    function setChatLastStatus(status) {
      const el = document.getElementById('chatLastStatus');
      if (!el) return;
      // Map statuses to compact icons: sent -> ✓, delivered -> ✓✓, seen -> 👁
      const map = {
        sending: '⏳',
        sent: '✓',
        delivered: '✓✓',
        seen: '👁'
      };
      el.textContent = map[status] || '';
      el.title = status === 'sending' ? 'Sending' : (status === 'sent' ? 'Sent' : (status === 'delivered' ? 'Delivered' : (status === 'seen' ? 'Seen' : '')));
      el.className = 'chat-last-status ' + (status ? 'status-' + status : '');
    }

    function appendMessage(sender, payload, side='own', readStatus='', messageStatus='sending', messageId=null){
      // payload can be string or { type: 'image'|'text'|'file'|'audio', content: '...'}
      const mid = messageId || generateMessageId();
      const el = document.createElement('div');
      el.className = 'message ' + (side === 'own' ? 'own' : 'other');
      el.dataset.messageId = mid;
      el.dataset.messageStatus = messageStatus;

      // content
      const content = document.createElement('div');
      content.className = 'content';
      if (typeof payload === 'string') {
        content.innerHTML = `<span>${escapeHtml(payload)}</span>`;
      } else if (payload && payload.type === 'image') {
        const img = document.createElement('img'); img.src = payload.content; img.style.maxWidth='320px'; img.style.borderRadius='10px'; content.appendChild(img);
      } else if (payload && payload.type === 'audio') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'auto';
        audio.src = payload.content;
        audio.className = 'audio-player';
        // Ensure audible playback defaults
        try { audio.volume = 1.0; } catch (e) {}
        audio.addEventListener('error', (ev)=>{ console.warn('Audio playback error', ev); });
        content.appendChild(audio);
      } else if (payload && payload.type === 'file') {
        const a = document.createElement('a'); a.href = payload.content || '#'; a.innerText = payload.name || 'Attachment'; content.appendChild(a);
      } else {
        content.innerHTML = `<span>${escapeHtml(JSON.stringify(payload))}</span>`;
      }

      el.appendChild(content);
      // meta / status
      const meta = document.createElement('div'); meta.className = 'meta';
      const time = document.createElement('span'); time.className = 'time'; time.textContent = new Date().toLocaleTimeString(); meta.appendChild(time);
      el.appendChild(meta);
      // status
      const s = createStatusEl(messageStatus); el.appendChild(s);

      // Reactions UI (single-choice)
      const reactions = document.createElement('div'); reactions.className = 'message-reactions';
      const emojiList = ['❤️','😂','😮','😢','👍'];
      emojiList.forEach(em => {
        const btn = document.createElement('button'); btn.className = 'reaction-btn'; btn.type = 'button'; btn.innerText = em;
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          // toggle single reaction
          const current = el.dataset.reaction;
          const selected = current === em ? '' : em;
          el.dataset.reaction = selected || '';
          // visually mark selected buttons
          reactions.querySelectorAll('.reaction-btn').forEach(b=> b.style.opacity = (b.innerText === selected ? '1' : '0.5'));
          // send reaction to server (websocket preferred)
          try {
            if (window.sendWS) sendWS({ type: 'reaction', messageId: el.dataset.messageId, reaction: selected });
            else fetch('/api/messages/reaction', { method:'POST', headers: {'content-type':'application/json','authorization':`Bearer ${currentToken}`}, body: JSON.stringify({ messageId: el.dataset.messageId, reaction: selected }) }).catch(()=>{});
          } catch (e) { console.warn('send reaction failed', e); }
        });
        reactions.appendChild(btn);
      });
      el.appendChild(reactions);

      // Reply button
      const replyBtn = document.createElement('button'); replyBtn.type='button'; replyBtn.className='reply-btn'; replyBtn.style.marginLeft='8px'; replyBtn.textContent='Reply';
      replyBtn.addEventListener('click', ()=>{
        window.replyTo = { id: el.dataset.messageId, text: (payload && payload.type==='text') ? payload.content : (payload && payload.type==='image' ? '[Image]' : '') };
        if (messageInput) { messageInput.focus(); messageInput.placeholder = `Replying to: ${window.replyTo.text}`; }
      });
      meta.appendChild(replyBtn);
      // Delete button (for me / for everyone)
      const deleteBtn = document.createElement('button'); deleteBtn.type='button'; deleteBtn.className='delete-btn'; deleteBtn.style.marginLeft='8px'; deleteBtn.textContent='Delete';
      deleteBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const choice = confirm('Delete this message for everyone? (Cancel = delete for you only)');
        const scope = choice ? 'all' : 'me';
        try {
          const convoId = [window.currentOtherId, currentUserId].sort().join('-');
          const mid = el.dataset.messageId;
          const url = `/api/messages/${encodeURIComponent(convoId)}/${encodeURIComponent(mid)}?scope=${scope}`;
          const res = await fetch(url, { method: 'DELETE', headers: { 'authorization': `Bearer ${currentToken}` } });
          if (!res.ok) { const j = await res.json().catch(()=>({})); return alert(j.error || 'Failed to delete message'); }
          if (scope === 'all') {
            // remove element
            el.remove();
          } else {
            // mark as deleted for me
            el.querySelector('.content').innerHTML = '<em style="color:var(--muted)">Message deleted</em>';
          }
        } catch (e) { console.warn('delete message failed', e); alert('Failed to delete message'); }
      });
      meta.appendChild(deleteBtn);

      messagesLog.appendChild(el);
      // auto-scroll for own messages
      if (side === 'own') messagesLog.scrollTop = messagesLog.scrollHeight;
      return el;
    }

    function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

    // send read receipts for visible messages from the other user
    function sendReadReceiptsIfVisible(otherId) {
      if (!ws || ws.readyState !== 1) return;
      const visibles = Array.from(messagesLog.querySelectorAll('.message.other')).filter(m => m.dataset.messageStatus !== 'seen');
      const ids = visibles.map(m => m.dataset.messageId).filter(Boolean);
      if (ids.length === 0) return;
      // send over websocket
      if (window.sendWS) sendWS({ type: 'read', ids, toId: otherId });
      // optimistically mark as seen locally
      ids.forEach(id => { const el = document.querySelector(`[data-message-id="${id}"]`); if (el) updateMessageStatus(el, 'seen'); });
    }

    // send read receipts when user scrolls to bottom of messages
    if (messagesLog) {
      messagesLog.addEventListener('scroll', ()=>{
        const nearBottom = (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < 120;
        if (nearBottom && window.currentOtherId) sendReadReceiptsIfVisible(window.currentOtherId);
      });
    }

    // Ensure audio elements created dynamically will be playable and audible
    document.addEventListener('play', (e) => {
      const tgt = e.target;
      if (tgt && tgt.tagName === 'AUDIO') {
        try { tgt.volume = 1.0; } catch (e) {}
        try { tgt.play(); } catch (e) {}
      }
    }, true);

    // Paste handler: allow pasting images into the message input
    (function(){
      const pasteTarget = messageInput || document;
      pasteTarget.addEventListener('paste', (ev)=>{
        if (!ev.clipboardData) return;
        const items = Array.from(ev.clipboardData.items || []);
        const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
        if (!imgItem) return;
        const blob = imgItem.getAsFile();
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = async (e)=>{
          // Use CDN upload for pasted images, then send message with media URL
          const dataUrl = e.target.result;
          // optimistic local bubble using the raw data URL so user sees immediate preview
          const localEl = appendMessage('Me', { type: 'image', content: dataUrl }, 'own', '', 'sending');
          const clientId = localEl.dataset.messageId;

          try {
            // upload to CDN (function handles presign fallback)
            const up = await uploadMediaToCDN(dataUrl, 'pasted.png');
            const mediaUrl = (up && up.url) ? up.url : dataUrl;

            // update local bubble to use CDN url (less memory footprint)
            const img = localEl.querySelector('img'); if (img) img.src = mediaUrl;

            // send via websocket including clientId so server can reconcile
            if (window.sendWS) {
              sendWS({ type: 'message', toId: window.currentOtherId, message: { type: 'image', content: mediaUrl }, clientId });
            } else {
              // fallback to REST POST
              await fetch('/api/messages', { method: 'POST', headers: { 'content-type':'application/json','authorization':`Bearer ${currentToken}` }, body: JSON.stringify({ toId: window.currentOtherId, type: 'image', content: mediaUrl, clientId }) });
            }
          } catch (uploadErr) {
            console.warn('Paste upload failed, leaving dataURL in bubble', uploadErr);
          }
        };
        reader.readAsDataURL(blob);
        ev.preventDefault();
      });
    })();

    // Avatar modal close handler
    if (avatarModal) {
      avatarModal.addEventListener('click', (e)=>{
        if (e.target === avatarModal || e.target.classList.contains('close-modal-btn')) {
          avatarModal.classList.add('hidden');
        }
      });
    }

    // Global delegation: clicking any avatar image opens full-size modal
    document.addEventListener('click', (e)=>{
      const tgt = e.target;
      if (!tgt) return;
      // header avatar or chat-avatar img
      if (tgt.id === 'chatHeaderAvatar' || tgt.closest('.chat-avatar') || tgt.classList.contains('chat-header-avatar')) {
        const src = tgt.tagName === 'IMG' ? tgt.src : tgt.querySelector && tgt.querySelector('img') ? tgt.querySelector('img').src : null;
        if (src && avatarModal && avatarModalImg) {
          avatarModalImg.src = src; avatarModal.classList.remove('hidden');
        }
      }
    });

    // (Message send handled by the main form submit implementation later in file.)

  // ===== NAVIGATION =====
  function switchView(view) {
    // hide all views (both inline style and 'hidden' class)
    document.querySelectorAll('.view').forEach(v => {
      v.style.display = 'none';
      v.classList.add('hidden');
    });

    // show target view (remove hidden class and set display)
    try {
      view.classList.remove('hidden');
      view.style.display = 'block';
    } catch (e) {
      console.warn('[ui] switchView target invalid', e);
      return;
    }

    document.querySelectorAll('.nav-btn:not(#logoutBtn)').forEach(b => b.classList.remove('active'));
    try { if (view === storiesView && storiesBtn) storiesBtn.classList.add('active'); } catch(e){}
    try { if (view === chatsView && chatsBtn) chatsBtn.classList.add('active'); } catch(e){}
    try { if (view === cameraView && cameraBtn) cameraBtn.classList.add('active'); } catch(e){}
    try { if (view === profileView && profileBtn) profileBtn.classList.add('active'); } catch(e){}

    if (view === cameraView) initCamera();
  }

  // ===== STORIES: load and viewer =====
  async function loadStories() {
    try {
      if (!storiesGrid) return;
      storiesGrid.innerHTML = '<p style="color:var(--muted)">Loading...</p>';
      const res = await fetch(`${API_PREFIX}/stories`);
      if (!res.ok) { storiesGrid.innerHTML = '<p style="color:var(--muted)">Failed to load stories</p>'; return; }
      const list = await res.json();
      if (!list || list.length === 0) { storiesGrid.innerHTML = '<p style="color:var(--muted)">No stories</p>'; return; }
      storiesGrid.innerHTML = '';
      list.forEach(s => {
        const card = document.createElement('div'); card.className = 'story-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <img src="${s.media}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;" />
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><strong>${escapeHtml(s.username)}</strong><span style="font-size:12px;color:var(--muted);">${new Date(s.createdAt).toLocaleString()}</span></div>
        `;
        card.addEventListener('click', async () => {
          try {
            // mark view
            await fetch(`${API_PREFIX}/stories/${s.storyId}/view`, { method: 'POST' });
          } catch(e){}
          // open viewer
          const imgEl = document.getElementById('storyImage');
          const vidEl = document.getElementById('storyVideo');
          const audioEl = document.getElementById('storyAudio');
          const captionEl = document.getElementById('storyCaption');
          const musicInfo = document.getElementById('storyMusicInfo');
          const usernameEl = document.getElementById('storyUsername');
          if (!imgEl || !vidEl || !audioEl) return;
          // reset
          imgEl.style.display = 'none'; vidEl.style.display = 'none'; audioEl.style.display = 'none';
          if (s.media && s.media.match(/\.(mp4|webm|ogg)$/i)) {
            vidEl.src = s.media; vidEl.style.display = 'block'; vidEl.play().catch(()=>{});
          } else {
            imgEl.src = s.media; imgEl.style.display = 'block';
          }
          if (s.audio) { audioEl.src = s.audio; audioEl.style.display = 'block'; }
          usernameEl && (usernameEl.textContent = s.username);
          captionEl && (captionEl.textContent = s.caption || '');
          musicInfo && (musicInfo.textContent = s.music ? (s.music.name || s.music) : '');
          const viewer = document.getElementById('storyViewerModal');
          if (viewer) viewer.classList.remove('hidden');
        });
        storiesGrid.appendChild(card);
      });
    } catch (e) { console.warn('loadStories error', e); if (storiesGrid) storiesGrid.innerHTML = '<p style="color:var(--muted)">Error loading stories</p>'; }
  }

  // ===== CAMERA Initialization =====
  let _cameraInitialized = false;
  async function initCamera() {
    try {
      if (_cameraInitialized) return;
      _cameraInitialized = true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return console.warn('Camera not supported');

      console.debug('[camera] requesting media (video+audio)');
      // Request audio as well so MediaRecorder can record; many browsers require audio permission
      localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      console.debug('[camera] getUserMedia success', { tracks: localStream.getTracks().map(t=>({ kind: t.kind, enabled: t.enabled })) });

      if (cameraStream) {
        cameraStream.srcObject = localStream;
        cameraStream.play().catch((err)=>{ console.warn('[camera] play failed', err); });
      }

      // Prepare MediaRecorder for recording functionality
      try {
        recordedChunks = [];
        if (typeof MediaRecorder !== 'undefined') {
          mediaRecorder = new MediaRecorder(localStream);
          mediaRecorder.addEventListener('dataavailable', (e)=>{ if (e.data && e.data.size) recordedChunks.push(e.data); });
          mediaRecorder.addEventListener('start', ()=>{ console.debug('[camera] mediaRecorder started'); if (recordBtn) recordBtn.textContent = 'Stop'; });
          mediaRecorder.addEventListener('stop', ()=>{ console.debug('[camera] mediaRecorder stopped'); if (recordBtn) recordBtn.textContent = 'Record'; });
          mediaRecorder.addEventListener('error', (ev)=>{ console.warn('[camera] mediaRecorder error', ev); });
          console.debug('[camera] MediaRecorder prepared', { mimeType: mediaRecorder.mimeType });
        } else {
          console.warn('[camera] MediaRecorder not supported in this browser');
        }
      } catch (mrErr) { console.warn('[camera] prepare MediaRecorder failed', mrErr); }

      if (snapBtn) snapBtn.addEventListener('click', () => {
        console.debug('[camera] snap button clicked');
        try {
          const canvas = snapCanvas || document.createElement('canvas');
          const video = cameraStream;
          canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          if (snapImage) snapImage.src = dataUrl;
          if (snapPreview) snapPreview.classList.remove('hidden');
        } catch (e) { console.warn('snap error', e); }
      });

      if (resnapBtn) resnapBtn.addEventListener('click', () => { if (snapPreview) snapPreview.classList.add('hidden'); });

      if (sendSnapBtn) sendSnapBtn.addEventListener('click', async () => {
        try {
          const img = snapImage && snapImage.src;
          const caption = snapCaption && snapCaption.value;
          const music = selectedMusicInput && selectedMusicInput.value;
          if (!img) return alert('No snap to send');
          console.debug('[camera] uploading snap');
          const up = await uploadMediaToCDN(img, 'story.jpg');
          const mediaUrl = up && (up.url || up.publicUrl) ? (up.url || up.publicUrl) : img;
          const body = { media: mediaUrl, caption: caption || '', music: music || null };
          const res = await fetch(`${API_PREFIX}/stories`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) { const j = await res.json().catch(()=>({})); return alert(j.error || 'Failed to post story'); }
          alert('Story posted');
          snapPreview && snapPreview.classList.add('hidden');
          loadStories();
        } catch (e) { console.error('send snap error', e); alert('Failed to send snap'); }
      });

      // Recording toggling
      if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
          try {
            console.debug('[camera] record button clicked', { mediaRecorderState: mediaRecorder && mediaRecorder.state });
            if (!mediaRecorder) {
              console.warn('[camera] No mediaRecorder available');
              return alert('Recording not supported in this browser');
            }
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              // create blob and preview
              const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || 'video/webm' });
              const url = URL.createObjectURL(blob);
              // show preview (audio or video)
              if (snapPreview) snapPreview.classList.remove('hidden');
              let previewEl = snapPreview.querySelector('.record-preview');
              if (!previewEl) {
                previewEl = document.createElement(blob.type.startsWith('audio/') ? 'audio' : 'video');
                previewEl.className = 'record-preview';
                previewEl.controls = true;
                snapPreview.appendChild(previewEl);
              }
              previewEl.src = url;
              if (previewEl.tagName === 'VIDEO') previewEl.play().catch(()=>{});
              // reset chunks for next recording
              recordedChunks = [];
            } else {
              recordedChunks = [];
              mediaRecorder.start();
            }
          } catch (e) { console.warn('[camera] record toggle failed', e); }
        });
      }
    } catch (e) { console.warn('initCamera error', e); }
  }

  function showFriendProfile(friendId, friendName, friendAvatar) {
    // Populate profile view with friend data
    document.getElementById('profileName').textContent = friendName;
    document.getElementById('profileAvatar').src = friendAvatar || '/path/to/placeholder.jpg';
    
    // Fetch friend stats
    (async () => {
      try {
        const userRes = await fetch(`/api/users/${friendId}`, {
          headers: { 'authorization': `Bearer ${currentToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          document.getElementById('profileBio').textContent = userData.bio || 'Snapchat enthusiast';
          document.getElementById('friendCount').textContent = userData.friendCount || 0;
          document.getElementById('storyCount').textContent = userData.storyCount || 0;
        }
        
        // Get Wimp Score
        const scoreRes = await fetch(`/api/scores/${friendId}`, {
          headers: { 'authorization': `Bearer ${currentToken}` }
        });
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          document.getElementById('profileWimpScore').textContent = scoreData.score || 0;
        }
        
        // Get Streak
        const streakRes = await fetch(`/api/streaks/${friendId}`, {
          headers: { 'authorization': `Bearer ${currentToken}` }
        });
        if (streakRes.ok) {
          const streakData = await streakRes.json();
          document.getElementById('profileStreakCount').textContent = streakData.streak?.streakCount || 0;
        }
      } catch (e) {
        console.warn('Error loading friend profile', e);
      }
    })();
    
    // Hide edit/add buttons since viewing friend profile
    const editBtn = document.getElementById('editProfileBtn');
    const addBtn = document.getElementById('addFriendsBtn');
    const shareBtn = document.getElementById('shareProfileBtn');
    const backBtn = document.getElementById('backToChatBtn');
    
    if (editBtn) editBtn.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (shareBtn) shareBtn.style.display = 'block';
    if (backBtn) {
      backBtn.style.display = 'block';
      backBtn.onclick = () => {
        // Return to chat view if we came from chat
        if (window.currentOtherId) {
          chatDetail.style.display = 'block';
          const chatView = document.getElementById('chatsView');
          const profileView = document.getElementById('profileView');
          if (chatView) chatView.classList.add('hidden');
          if (profileView) profileView.classList.add('hidden');
        }
      };
    }
    
    // Switch to profile view
    switchView(profileView);
  }

  if (storiesBtn) {
    storiesBtn.addEventListener('click', () => { 
      if (!isAdmin) { switchView(storiesView); loadStories(); }
      else switchView(storiesView);
    });
  } else console.warn('[ui] storiesBtn not found');

  if (callsBtn) {
    callsBtn.addEventListener('click', () => { switchView(callsView); loadCallsList(); });
  }
  const refreshCallsBtn = document.getElementById('refreshCallsBtn');
  if (refreshCallsBtn) refreshCallsBtn.addEventListener('click', () => loadCallsList());

  if (chatsBtn) {
    chatsBtn.addEventListener('click', () => { if (!isAdmin) { switchView(chatsView); loadChatsList(); } });
  } else console.warn('[ui] chatsBtn not found');

  if (cameraBtn) {
    cameraBtn.addEventListener('click', () => { if (!isAdmin) switchView(cameraView); });
  } else console.warn('[ui] cameraBtn not found');

  if (profileBtn) {
    profileBtn.addEventListener('click', () => { 
      if (!isAdmin) { 
        switchView(profileView); 
        updateProfile(); 
        // Reset buttons for self profile
        const editBtn = document.getElementById('editProfileBtn');
        const addBtn = document.getElementById('addFriendsBtn');
        const shareBtn = document.getElementById('shareProfileBtn');
        const backBtn = document.getElementById('backToChatBtn');
        if (editBtn) editBtn.style.display = 'block';
        if (addBtn) addBtn.style.display = 'block';
        if (shareBtn) shareBtn.style.display = 'block';
        if (backBtn) backBtn.style.display = 'none';
      } 
    });
  } else console.warn('[ui] profileBtn not found');

  async function updateProfile() {
    try {
      const res = await fetch('/api/users/self');
      if (!res.ok) return console.warn('Failed to load profile');
      const u = await res.json();
      currentUser = u; currentUserId = u.userId;
      // Update UI
      if (profileAvatar) profileAvatar.src = u.avatar || '';
      if (profileName) profileName.textContent = u.username || '';
      if (profileBio) profileBio.textContent = u.bio || '';
      if (friendCount) friendCount.textContent = (u.friends || []).length || 0;
      if (storyCount) storyCount.textContent = (u.stories || []).length || 0;

      // Spotify connected display
      const spotifyConnected = !!(u.spotify && u.spotify.access_token);
      // create status element inside settings/profile if missing
      if (!spotifyConnectStatus) {
        const el = document.createElement('div'); el.id = 'spotifyConnectStatus';
        el.style.fontSize = '13px'; el.style.color = spotifyConnected ? '#7cfc00' : '#999';
        el.textContent = spotifyConnected ? 'Spotify: Connected' : 'Spotify: Not connected';
        if (profileView) profileView.querySelector('.profile-card')?.appendChild(el);
      } else {
        spotifyConnectStatus.textContent = spotifyConnected ? 'Spotify: Connected' : 'Spotify: Not connected';
        spotifyConnectStatus.style.color = spotifyConnected ? '#7cfc00' : '#999';
      }
      // Update connect button label if present
      if (spotifyConnectBtnHeader) spotifyConnectBtnHeader.textContent = spotifyConnected ? '🔗 Connected' : 'Connect Spotify';

    } catch (e) { console.warn('updateProfile error', e); }
  }

  // Spotify connect flow: request short-lived session and open popup
  if (spotifyConnectBtn) spotifyConnectBtn.addEventListener('click', async () => {
    if (!currentToken) return alert('Log in to connect Spotify');
    spotifyConnectBtn.disabled = true;
    try {
      const res = await fetch('/api/spotify/session', { method: 'POST', headers: { 'authorization': `Bearer ${currentToken}` } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(j.error || 'Failed to start Spotify auth'); spotifyConnectBtn.disabled = false; return; }
      const popup = window.open(j.url, 'spotify_auth', 'width=600,height=800');
      if (!popup) { alert('Popup blocked — allow popups and try again'); spotifyConnectBtn.disabled = false; return; }
      const poll = setInterval(() => {
        if (popup.closed) { clearInterval(poll); spotifyConnectBtn.disabled = false; updateProfile(); alert('Spotify auth window closed'); }
      }, 1000);
    } catch (e) { console.error('spotify connect error', e); alert('Error starting Spotify auth'); spotifyConnectBtn.disabled = false; }
  });

  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (!isAdmin) { switchView(settingsView); loadSettings(); }
    });
  } else console.warn('[ui] settingsBtn not found');
  // ===== PUSH NOTIFICATIONS (Service Worker & Subscriptions) =====
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        return reg;
      } catch (e) { console.error('SW registration failed', e); }
    }
    return null;
  }

  async function subscribePush() {
    if (!currentToken) return alert('Log in to enable notifications');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return alert('Push not supported in this browser');
    const reg = await registerSW();
    if (!reg) return;
    // ask server for VAPID public key
    const pkRes = await fetch('/api/push/publicKey');
    if (!pkRes.ok) {
      console.error('Failed to get VAPID public key', pkRes.status);
      alert('Push not available: server did not provide a public key');
      return;
    }
    const pkJson = await pkRes.json();
    const publicKey = pkJson.publicKey;
    if (!publicKey) {
      alert('Push not available: public key missing');
      return;
    }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    // send to server
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ subscription: sub }) });
    localStorage.setItem('wimpex_push_endpoint', sub.endpoint);
    if (enableNotificationsBtn) enableNotificationsBtn.textContent = '🔕';
    alert('Notifications enabled');
  }

  async function unsubscribePush() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ endpoint }) });
    localStorage.removeItem('wimpex_push_endpoint');
    alert('Notifications disabled');
  }

  // Notification preferences button in settings
  const openNotifPrefsBtn = document.getElementById('openNotifPrefsBtn');
  const notificationsPrefsModal = document.getElementById('notificationsPrefsModal');
  const savePrefsBtn = document.getElementById('savePrefsBtn');
  
  if (openNotifPrefsBtn) {
    openNotifPrefsBtn.addEventListener('click', () => {
      if (notificationsPrefsModal) notificationsPrefsModal.style.display = 'flex';
    });
  }

  // Handle notification preference saves
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', async () => {
      try {
        const dndToggle = document.getElementById('dndToggle');
        const snapNotifToggle = document.getElementById('snapNotifToggle');
        const msgNotifToggle = document.getElementById('msgNotifToggle');
        const friendNotifToggle = document.getElementById('friendNotifToggle');

        const prefs = {
          doNotDisturb: dndToggle?.checked || false,
          snapNotifications: snapNotifToggle?.checked || true,
          messageNotifications: msgNotifToggle?.checked || true,
          friendRequestNotifications: friendNotifToggle?.checked || true
        };

        // Save to localStorage
        localStorage.setItem('wimpex_notif_prefs', JSON.stringify(prefs));

        // Try to update on server if available
        if (currentToken) {
          await fetch('/api/users/notifications', {
            method: 'POST',
            headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
            body: JSON.stringify(prefs)
          }).catch(() => {});
        }

        alert('Notification preferences saved');
        if (notificationsPrefsModal) notificationsPrefsModal.style.display = 'none';
      } catch (e) {
        console.error('Error saving preferences', e);
        alert('Failed to save preferences');
      }
    });
  }

  // Close button for notifications prefs modal
  const notifPrefsCloseBtn = notificationsPrefsModal?.querySelector('.close-modal-btn');
  if (notifPrefsCloseBtn) {
    notifPrefsCloseBtn.addEventListener('click', () => {
      if (notificationsPrefsModal) notificationsPrefsModal.style.display = 'none';
    });
  }

  // Recommendations button
  const recommendationsBtn = document.getElementById('recommendationsBtn');
  if (recommendationsBtn) {
    recommendationsBtn.addEventListener('click', () => {
      if (!isAdmin) { switchView(recommendationsView); loadRecommendations(); loadPendingFriendRequests(); }
    });
  } else console.warn('[ui] recommendationsBtn not found');

  // Wimpy quick access
  if (wimpyBtn) {
    wimpyBtn.addEventListener('click', () => {
      switchView(wimpyView);
      loadWimpyConversations();
    });
  }
  if (wimpyRefreshBtn) wimpyRefreshBtn.addEventListener('click', () => loadWimpyConversations());
  if (wimpyNewBtn) wimpyNewBtn.addEventListener('click', async () => {
    try {
      const text = prompt('Start new Wimpy chat with an initial prompt:');
      if (!text) return;
      const res = await fetch('/api/wimpy/message', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) return alert('Failed to create conversation');
      await loadWimpyConversations();
    } catch (e) { console.warn('Wimpy new chat error', e); }
  });

  // People search live UI
  const peopleSearchInput = document.getElementById('peopleSearchInput');
  const peopleSearchBtn = document.getElementById('peopleSearchBtn');
  const recommendationsList = document.getElementById('recommendationsList');
  const pendingRequestsList = document.getElementById('pendingRequestsList');

  // Simple debounce
  function debounce(fn, wait = 250) {
    let t = null; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  async function renderPeopleResults(q) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return console.warn('Search failed');
      const list = await res.json();
      recommendationsList.innerHTML = '';
      if (!list || list.length === 0) {
        recommendationsList.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">No users found</p>';
        return;
      }
      list.forEach(u => {
        const el = document.createElement('div');
        el.className = 'recommendation';
        el.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${u.avatar || '/placeholder.png'}" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:600;">${u.username}</div>
              <div style="font-size:13px;color:var(--muted);">${u.bio || ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button class="add-friend-btn gold-btn">Add</button>
            </div>
          </div>
        `;
        const btn = el.querySelector('.add-friend-btn');
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = 'Sending...';
          const r = await fetch('/api/friends/requests/send', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ targetId: u.userId }) });
          if (r.ok) { btn.textContent = 'Requested'; } else { btn.textContent = 'Error'; btn.disabled = false; }
        });
        recommendationsList.appendChild(el);
      });
    } catch (e) { console.warn('People search error', e); }
  }

  // Load pending friend requests for People view
  async function loadPendingFriendRequests() {
    try {
      const el = pendingRequestsList;
      if (!el) return;
      el.innerHTML = '<p style="color:var(--muted);">Loading...</p>';
      const res = await fetch('/api/friend-requests/pending', { headers: { 'authorization': `Bearer ${currentToken}` } });
      if (!res.ok) { el.innerHTML = '<p style="color:var(--muted);">Failed to load</p>'; return; }
      const list = await res.json();
      if (!list || list.length === 0) { el.innerHTML = '<p style="color:var(--muted);">No pending requests</p>'; return; }
      el.innerHTML = '';
      list.forEach(r => {
        const row = document.createElement('div');
        row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '10px';
        row.style.padding = '6px'; row.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
        row.innerHTML = `
          <img src="${r.fromAvatar || '/placeholder.png'}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />
          <div style="flex:1;"><div style="font-weight:600">${r.fromUsername}</div><div style="font-size:12px;color:var(--muted)">${new Date(r.createdAt).toLocaleString()}</div></div>
          <div style="display:flex;gap:6px"><button class="accept-req gold-btn">Accept</button><button class="decline-req" style="background:transparent;border:1px solid rgba(255,255,255,0.04);padding:6px 8px;border-radius:6px;color:var(--muted);">Decline</button></div>
        `;
        const acceptBtn = row.querySelector('.accept-req');
        const declineBtn = row.querySelector('.decline-req');
        acceptBtn.addEventListener('click', async () => {
          acceptBtn.disabled = true; acceptBtn.textContent = 'Accepting...';
          const r2 = await fetch('/api/friend-requests/accept', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ fromId: r.fromId }) });
          if (!r2.ok) { acceptBtn.textContent = 'Error'; acceptBtn.disabled = false; return; }
          acceptBtn.textContent = 'Accepted';
          try { loadPendingFriendRequests(); updateProfile(); } catch(e){}
        });
        declineBtn.addEventListener('click', async () => {
          declineBtn.disabled = true; declineBtn.textContent = 'Declining...';
          const r2 = await fetch('/api/friend-requests/decline', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ fromId: r.fromId }) });
          if (!r2.ok) { declineBtn.textContent = 'Error'; declineBtn.disabled = false; return; }
          row.remove();
        });
        el.appendChild(row);
      });
    } catch (e) {
      console.warn('loadPendingFriendRequests error', e);
    }
  }

  const debouncedRender = debounce((q) => { if (q && q.trim()) renderPeopleResults(q.trim()); else { recommendationsList.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">Type to search users</p>'; } }, 250);

  if (peopleSearchInput) {
    peopleSearchInput.addEventListener('input', (e) => { const q = e.target.value; debouncedRender(q); });
  }
  if (peopleSearchBtn) {
    peopleSearchBtn.addEventListener('click', () => { const q = peopleSearchInput.value.trim(); if (q) renderPeopleResults(q); });
  }

  // ===== 2FA UI Handlers =====
  if (enable2faBtn) enable2faBtn.addEventListener('click', async () => {
    if (!currentToken) return alert('Please log in to enable 2FA');
    if (twoFaSetupArea) twoFaSetupArea.style.display = 'none';
    if (twoFaLoginArea) twoFaLoginArea.style.display = 'none';
    if (twoFaModal) twoFaModal.style.display = 'flex';
    if (twoFaSetupStatus) twoFaSetupStatus.textContent = 'Loading...';
    try {
      const res = await fetch('/api/2fa/setup', { headers: { 'authorization': `Bearer ${currentToken}` } });
      const j = await res.json();
      if (!res.ok) { if (twoFaSetupStatus) twoFaSetupStatus.textContent = j.error || 'Error'; return; }
      if (twoFaQr) twoFaQr.src = j.qr;
      if (twoFaSecret) twoFaSecret.textContent = j.secret;
      if (twoFaSetupArea) twoFaSetupArea.style.display = 'block';
      if (twoFaSetupStatus) twoFaSetupStatus.textContent = '';
    } catch (e) {
      if (twoFaSetupStatus) twoFaSetupStatus.textContent = 'Error';
    }
  });

  if (cancel2faBtn) cancel2faBtn.addEventListener('click', () => {
    if (twoFaModal) twoFaModal.style.display = 'none';
    if (twoFaSetupStatus) twoFaSetupStatus.textContent = '';
    if (twoFaLoginStatus) twoFaLoginStatus.textContent = '';
    if (twoFaSetupCode) twoFaSetupCode.value = '';
    if (twoFaLoginCode) twoFaLoginCode.value = '';
  });

  if (confirm2faBtn) confirm2faBtn.addEventListener('click', async () => {
    const code = twoFaSetupCode?.value.trim();
    if (!code) { if (twoFaSetupStatus) twoFaSetupStatus.textContent = 'Enter code'; return; }
    if (twoFaSetupStatus) twoFaSetupStatus.textContent = 'Verifying...';
    try {
      const res = await fetch('/api/2fa/verify', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ code }) });
      const j = await res.json();
      if (!res.ok) { if (twoFaSetupStatus) twoFaSetupStatus.textContent = j.error || 'Invalid code'; return; }
      if (twoFaModal) twoFaModal.style.display = 'none';
      if (twoFaSetupStatus) twoFaSetupStatus.textContent = '';
      alert('2FA enabled');
    } catch (e) { if (twoFaSetupStatus) twoFaSetupStatus.textContent = 'Error verifying'; }
  });

  if (disable2faBtn) disable2faBtn.addEventListener('click', async () => {
    if (!currentToken) return alert('Please log in to disable 2FA');
    const code = prompt('Enter current 2FA code to disable');
    if (!code) return;
    try {
      const res = await fetch('/api/2fa/disable', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ code }) });
      const j = await res.json();
      if (!res.ok) return alert(j.error || 'Failed to disable 2FA');
      alert('2FA disabled');
    } catch (e) { alert('Error disabling 2FA'); }
  });

  if (submit2faLoginBtn) submit2faLoginBtn.addEventListener('click', async () => {
    const code = twoFaLoginCode?.value.trim();
    if (!code) { if (twoFaLoginStatus) twoFaLoginStatus.textContent = 'Enter code'; return; }
    if (twoFaLoginStatus) twoFaLoginStatus.textContent = 'Verifying...';
    try {
      const res = await fetch('/api/auth/login-2fa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tempToken: temp2FAToken, code }) });
      const j = await res.json();
      if (!res.ok) { if (twoFaLoginStatus) twoFaLoginStatus.textContent = j.error || 'Invalid code'; return; }
      const { userId, username, avatar, token } = j;
      currentUserId = userId;
      currentUser = { username, avatar, bio: 'New to Wimpex ✨', friends: [], followers: [] };
      currentToken = token;
      isAdmin = false;
      saveSession();
      if (twoFaModal) twoFaModal.style.display = 'none';
      if (twoFaLoginStatus) twoFaLoginStatus.textContent = '';
      onAuthSuccess();
      loadFriends();
    } catch (e) { if (twoFaLoginStatus) twoFaLoginStatus.textContent = 'Error during verify'; }
  });

  if (cancel2faLoginBtn) cancel2faLoginBtn.addEventListener('click', () => { if (twoFaModal) twoFaModal.style.display = 'none'; temp2FAToken = null; if (twoFaLoginStatus) twoFaLoginStatus.textContent = ''; });

  // ===== MEDIA CDN UPLOAD HELPERS =====
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  async function uploadMediaToCDN(dataUrl, filename = 'upload.jpg') {
    // Try presign first
    try {
      const pk = await fetch('/api/upload/presign?filename=' + encodeURIComponent(filename) + '&contentType=' + encodeURIComponent(dataUrl.split(':')[1].split(';')[0]), {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      if (pk.ok) {
        const pres = await pk.json();
        const blob = dataURLtoBlob(dataUrl);
        const put = await fetch(pres.url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } });
        if (put.ok) return { ok: true, url: pres.publicUrl };
      }
    } catch (e) {
      console.warn('Presign upload failed', e);
    }

    // Fallback: server-side CDN endpoint
    try {
      const res = await fetch('/api/upload/cdn', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ filename, data: dataUrl }) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Server CDN upload failed', e);
    }

    // Final fallback: return original dataUrl so existing endpoints can accept it
    return { ok: false, url: dataUrl };
  }

  // ---------- Image editor state for attachments ----------
  let wimpyAttachmentDataUrl = null; // final edited data url
  let _editorImg = null; // Image object
  let _editorAngle = 0;
  function openImageEditorWithDataUrl(dataUrl) {
    if (!imageEditorModal) return;
    imageEditorModal.classList.remove('hidden');
    const canvas = imageEditorCanvas;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      _editorImg = img; _editorAngle = 0;
      // set canvas to image natural size (limit to 1400px)
      const max = 1400;
      let w = img.naturalWidth, h = img.naturalHeight;
      const ratio = Math.min(1, max / Math.max(w,h));
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }
  function closeImageEditor() { if (!imageEditorModal) return; imageEditorModal.classList.add('hidden'); }
  function redrawEditor() {
    if (!imageEditorCanvas || !_editorImg) return;
    const canvas = imageEditorCanvas; const ctx = canvas.getContext('2d');
    // rotate around center
    const w = _editorImg.naturalWidth, h = _editorImg.naturalHeight;
    const ratio = canvas.width / w;
    ctx.save(); ctx.clearRect(0,0,canvas.width,canvas.height);
    if (_editorAngle % 360 === 0) {
      ctx.drawImage(_editorImg, 0, 0, canvas.width, canvas.height);
    } else {
      // simple rotate in-place (canvas is same size)
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.rotate((_editorAngle * Math.PI)/180);
      ctx.drawImage(_editorImg, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  if (wimpyAttachBtn && wimpyMediaInput) {
    wimpyAttachBtn.addEventListener('click', () => wimpyMediaInput.click());
    wimpyMediaInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        // open editor for images; for video just set data url directly
        if (f.type && f.type.startsWith('image/')) {
          openImageEditorWithDataUrl(ev.target.result);
        } else {
          // set as attachment directly for non-image
          wimpyAttachmentDataUrl = ev.target.result;
        }
      };
      reader.readAsDataURL(f);
    });
  }

  if (editorRotateBtn) editorRotateBtn.addEventListener('click', () => { _editorAngle = (_editorAngle + 90) % 360; redrawEditor(); });
  if (editorCropSquareBtn) editorCropSquareBtn.addEventListener('click', () => {
    if (!_editorImg || !imageEditorCanvas) return;
    const canvas = imageEditorCanvas; const ctx = canvas.getContext('2d');
    // center square crop
    const size = Math.min(canvas.width, canvas.height);
    const sx = Math.round((canvas.width - size)/2); const sy = Math.round((canvas.height - size)/2);
    const data = ctx.getImageData(sx, sy, size, size);
    canvas.width = size; canvas.height = size; ctx.putImageData(data, 0, 0);
  });
  if (editorSaveBtn) editorSaveBtn.addEventListener('click', () => {
    if (!imageEditorCanvas) return; wimpyAttachmentDataUrl = imageEditorCanvas.toDataURL('image/jpeg', 0.85); closeImageEditor();
  });
  if (editorCancelBtn) editorCancelBtn.addEventListener('click', () => { wimpyAttachmentDataUrl = null; closeImageEditor(); });

  // ---------- Wimpy form submit/attach flow ----------
  if (wimpyForm) {
    wimpyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (wimpyInput && wimpyInput.value) ? wimpyInput.value.trim() : '';
      if (!text && !wimpyAttachmentDataUrl) return alert('Enter a message or attach media');
      try {
        // show pending message in UI
        const clientId = generateMessageId();
        if (wimpyMessagesLog) wimpyMessagesLog.innerHTML += `<div class="wimpy-msg own" data-id="${clientId}">You: ${text || '[media]'} <em>...</em></div>`;

        let mediaUrl = null;
        if (wimpyAttachmentDataUrl) {
          const up = await uploadMediaToCDN(wimpyAttachmentDataUrl, 'wimpy_attach.jpg');
          mediaUrl = up && up.url ? up.url : wimpyAttachmentDataUrl;
        }

        const payload = { text, media: mediaUrl };
        const res = await fetch('/api/wimpy/message', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const txt = await res.text().catch(()=>''); throw new Error(txt || 'Wimpy request failed');
        }
        const j = await res.json().catch(()=>null);
        // display reply
        if (wimpyMessagesLog) wimpyMessagesLog.innerHTML += `<div class="wimpy-msg reply">Wimpy: ${j && j.reply ? (j.reply.text || JSON.stringify(j.reply)) : 'No reply'}</div>`;
        // clear inputs
        if (wimpyInput) wimpyInput.value = '';
        wimpyAttachmentDataUrl = null;
      } catch (err) {
        console.error('Failed to send to Wimpy', err);
        alert('Failed to send to Wimpy: ' + (err.message || err));
      }
    });
  }

  // ===== STORIES =====
  async function loadStories() {
    try {
      const res = await fetch(`${API_PREFIX}/stories`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      const stories = await res.json();
      storiesGrid.innerHTML = '';

      if (!Array.isArray(stories)) {
        console.error('Stories response is not an array', stories);
        return;
      }

      const friendIds = currentUser.friends || [];
      const friendStories = stories.filter(s => s.userId === currentUserId || friendIds.includes(s.userId));
      
      if (friendStories.length === 0) {
        storiesGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">No stories from you or your friends yet</p>';
        return;
      }

      friendStories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.innerHTML = `<img src="${story.media}" alt=""><div class="user-info">${story.username}</div><div class="story-caption" style="font-size:13px;color:var(--muted);margin-top:6px;">${story.caption || ''}</div>`;
        // If story has music (from Spotify), show a small music badge and preview button
        if (story.music && story.music.previewUrl) {
          const musicBadge = document.createElement('div');
          musicBadge.className = 'story-music-badge';
          musicBadge.innerHTML = `<button class="play-music-btn" data-preview="${story.music.previewUrl}" data-track="${encodeURIComponent(story.music.name)}">▶︎ ${story.music.name}</button>`;
          card.appendChild(musicBadge);
        }
        card.addEventListener('click', () => viewStory(story));
        storiesGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading stories:', err);
    }
  }

  function viewStory(story) {
    const modal = document.getElementById('storyViewerModal');
    const storyImage = document.getElementById('storyImage');
    const storyVideo = document.getElementById('storyVideo');
    const storyAudio = document.getElementById('storyAudio');
    const storyMusicInfo = document.getElementById('storyMusicInfo');
    const storyUsername = document.getElementById('storyUsername');
    const storyTimestamp = document.getElementById('storyTimestamp');

    if (story.media.endsWith('.mp4') || story.media.includes('video')) {
      storyImage.style.display = 'none';
      storyVideo.style.display = 'block';
      storyVideo.src = story.media;
    } else {
      storyImage.style.display = 'block';
      storyVideo.style.display = 'none';
      storyImage.src = story.media;
    }

    storyUsername.textContent = story.username;
    storyTimestamp.textContent = new Date(story.createdAt).toLocaleTimeString();
    const storyCaptionEl = document.getElementById('storyCaption');
    if (storyCaptionEl) storyCaptionEl.textContent = story.caption || '';
    // Music / audio handling
    if (story.music && story.music.previewUrl) {
      if (storyAudio) {
        storyAudio.style.display = 'block';
        storyAudio.src = story.music.previewUrl;
        storyAudio.play().catch(()=>{});
      }
      if (storyMusicInfo) storyMusicInfo.textContent = `${story.music.name} — ${story.music.artist || ''}`;
    } else if (story.audio) {
      if (storyAudio) {
        storyAudio.style.display = 'block';
        storyAudio.src = story.audio;
      }
      if (storyMusicInfo) storyMusicInfo.textContent = '';
    } else {
      if (storyAudio) { storyAudio.style.display = 'none'; storyAudio.src = ''; }
      if (storyMusicInfo) storyMusicInfo.textContent = '';
    }

    modal.style.display = 'block';

    fetch(`/api/stories/${story.storyId}/view`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ viewerId: currentUserId })
    });

    const closeBtn = document.getElementById('closeStoryViewer');
    closeBtn.onclick = () => {
      if (storyAudio) { try { storyAudio.pause(); } catch(e){} }
      modal.style.display = 'none';
    };
  }

  newStoryBtn.addEventListener('click', () => {
    if (!isAdmin) {
      switchView(cameraView);
      snapRecipient.value = 'story';
    }
  });

  // ===== CAMERA =====
  async function initCamera() {
    if (localStream) return;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraStream.srcObject = localStream;
      // Ensure the video element starts playing (some browsers require explicit play)
      try { await cameraStream.play(); } catch (e) {}
    } catch (err) {
      console.warn('initCamera error', err);
      alert('Camera access denied or not available');
    }
  }

  function applyFilter(filter) {
    cameraStream.style.filter = {
      'none': 'none',
      'sepia': 'sepia(100%)',
      'grayscale': 'grayscale(100%)',
      'invert': 'invert(100%)',
      'blur': 'blur(8px)',
      'warm': 'contrast(1.05) saturate(1.12) sepia(0.15) brightness(1.02)',
      'cool': 'hue-rotate(200deg) saturate(0.95) contrast(0.98)',
      'vivid': 'saturate(1.45) contrast(1.08) brightness(1.02)',
      'lomo': 'contrast(1.35) saturate(1.25) brightness(0.95)'
    }[filter] || 'none';
    currentFilter = filter;
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  if (snapBtn) snapBtn.addEventListener('click', async () => {
    if (!localStream) await initCamera();
    // ensure video has data
    if (!cameraStream.videoWidth || !cameraStream.videoHeight) {
      try { await cameraStream.play(); } catch(e) {}
    }
    const ctx = snapCanvas.getContext('2d');
    const w = cameraStream.videoWidth || 640;
    const h = cameraStream.videoHeight || 480;
    snapCanvas.width = w;
    snapCanvas.height = h;
    try { ctx.drawImage(cameraStream, 0, 0, w, h); } catch (e) { console.warn('drawImage failed', e); }
    snapImage.src = snapCanvas.toDataURL('image/jpeg', 0.8);
    snapPreview.style.display = 'block';
  });

  // Gallery upload for stories
  const galleryBtn = document.getElementById('galleryBtn');
  const galleryInput = document.getElementById('galleryInput');

  if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
      galleryInput.click();
    });
  }

  if (galleryInput) {
    galleryInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        snapImage.src = ev.target.result;
        snapPreview.style.display = 'block';
      };

      if (file.type.startsWith('video/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  // Delegated handler for story music preview playback
  storiesGrid.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.play-music-btn');
    if (!btn) return;
    e.stopPropagation();
    const preview = btn.dataset.preview;
    if (!preview) return alert('No preview available');
    // Create or reuse an audio element
    let audio = document.getElementById('storyPreviewAudio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'storyPreviewAudio';
      document.body.appendChild(audio);
    }
    if (audio.src !== preview) audio.src = preview;
    if (audio.paused) {
      audio.play().catch(() => alert('Playback failed'));
      btn.textContent = '⏸ ' + decodeURIComponent(btn.dataset.track || '') ;
    } else {
      audio.pause();
      btn.textContent = '▶︎ ' + decodeURIComponent(btn.dataset.track || '');
    }
  });

  resnapBtn.addEventListener('click', () => {
    snapPreview.style.display = 'none';
  });

  // Send snap / story
  if (sendSnapBtn) sendSnapBtn.addEventListener('click', async () => {
    if (!snapImage || !snapImage.src) return alert('No snap to send');
    sendSnapBtn.disabled = true; sendSnapBtn.textContent = 'Sending...';
    const mediaData = snapImage.src;
    const filename = 'snap_' + Date.now() + '.jpg';
    try {
      const up = await uploadMediaToCDN(mediaData, filename);
      const mediaUrl = up && up.url ? up.url : mediaData;
      const caption = (snapCaption && snapCaption.value) ? snapCaption.value : '';
      const recipient = (snapRecipient && snapRecipient.value) ? (snapRecipient.value.trim() || 'story') : 'story';

      if (recipient.toLowerCase() === 'story') {
        const r = await fetch('/api/stories', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ media: mediaUrl, caption }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Failed to post story');
        alert('Story posted');
        snapPreview.style.display = 'none';
        try { loadStories(); } catch(e) {}
      } else {
        const r = await fetch('/api/snaps', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ toId: recipient, media: mediaUrl }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Failed to send snap');
        alert('Snap sent');
        snapPreview.style.display = 'none';
      }
    } catch (e) {
      console.error('Send snap error', e);
      alert('Failed to send snap: ' + (e && e.message ? e.message : String(e)));
    }
    sendSnapBtn.disabled = false; sendSnapBtn.textContent = 'Send Snap';
  });

  if (recordBtn) recordBtn.addEventListener('click', async () => {
    if (!mediaRecorder) {
      recordedChunks = [];
      const mimeType = 'video/webm;codecs=vp8,opus';
      mediaRecorder = new MediaRecorder(localStream, { mimeType });
      mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          snapImage.src = reader.result;
          snapPreview.style.display = 'block';
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      recordBtn.style.background = 'rgba(212, 175, 55, 0.6)';
      recordBtn.textContent = '⏹ Stop';
    } else {
      mediaRecorder.stop();
      mediaRecorder = null;
      recordBtn.style.background = 'rgba(212, 175, 55, 0.2)';
      recordBtn.textContent = '⏺ Record';
    }
  });

  if (swapCameraBtn) swapCameraBtn.addEventListener('click', async () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
      const facing = cameraStream.videoWidth > cameraStream.videoHeight ? 'environment' : 'user';
      localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      cameraStream.srcObject = localStream;
    }
  });

  sendSnapBtn.addEventListener('click', async () => {
    const recipient = snapRecipient.value.trim();
    if (!recipient) return alert('Enter recipient or "story"');

    const media = snapImage.src;
    try {
      // UI: show uploading state
      sendSnapBtn.disabled = true; sendSnapBtn.textContent = 'Uploading...';
      // Upload media to CDN if possible and get a public URL
      const uploadRes = await uploadMediaToCDN(media, 'snap.jpg');
      const mediaUrl = uploadRes.url || media;

      if (recipient.toLowerCase() === 'story') {
        const caption = (snapCaption && snapCaption.value) ? snapCaption.value.trim() : '';
        let selectedMusic = null;
        try { selectedMusic = selectedMusicInput && selectedMusicInput.value ? JSON.parse(selectedMusicInput.value) : null; } catch(e) { selectedMusic = null; }

        // If the user attached an audio file, upload it and include as part of the story
        let audioUrl = null;
        if (snapAudioInput && snapAudioInput.files && snapAudioInput.files[0]) {
          const f = snapAudioInput.files[0];
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(f);
          });
          const aUpload = await uploadMediaToCDN(dataUrl, f.name || 'audio.mp3');
          audioUrl = aUpload.url || null;
        }

        const payload = { media: mediaUrl, caption, music: selectedMusic, audio: audioUrl };
        const storyRes = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!storyRes.ok) {
          const errText = await storyRes.text().catch(() => '');
          throw new Error(errText || 'Failed to post story');
        }
        // add points for story post
        fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 5 }) }).catch(()=>{});
        alert('✨ Story posted!');
        // reset composer fields
        if (snapCaption) snapCaption.value = '';
        if (selectedMusicInput) { selectedMusicInput.value = ''; }
        if (selectedMusicDisplay) selectedMusicDisplay.textContent = 'No music selected';
        if (snapAudioInput) snapAudioInput.value = '';
        loadStories();
      } else {
        const searchRes = await fetch(`/api/search?q=${recipient}`, {
          headers: { 'authorization': `Bearer ${currentToken}` }
        });
        const results = await searchRes.json();
        const user = results[0];
        if (user) {
            // If user is in current chat, create optimistic message bubble and include clientId
            let snapMsgEl = null;
            const clientId = generateMessageId();
            if (window.currentOtherId && window.currentOtherId === user.userId) {
              snapMsgEl = appendMessage(currentUser.username, { type: 'image', content: mediaUrl }, 'own', '', 'sending', clientId);
            }

            await fetch('/api/snaps', {
              method: 'POST',
              headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
              body: JSON.stringify({ toId: user.userId, media: mediaUrl, clientId })
            });

            // Notify server/recipient via websocket with clientId so they can reconcile
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'message', toId: user.userId, message: { type: 'image', content: mediaUrl }, clientId }));
            }
          // persist image metadata (no crop yet)
          fetch('/api/upload/save-image-meta', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ url: mediaUrl, crop: null }) }).catch(()=>{});
          // increment scores for snap sent
          fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 3 }) }).catch(()=>{});
          
          // Notify server of snap sent
          ws.send(JSON.stringify({ type: 'snap-sent', toId: user.userId }));
          
          // Check if streak should be activated (bidirectional snap exchange)
          try {
            const renewRes = await fetch('/api/streaks/renew', {
              method: 'POST',
              headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
              body: JSON.stringify({ otherId: user.userId })
            });
            if (renewRes.ok) {
              const renewData = await renewRes.json();
              // If streak was just activated (both users sent snaps), show notification
              if (renewData.activation && renewData.activation.needsActivation) {
                appendMessage('System', { type: 'text', content: '🔥 Streak Started! Keep it alive by sending snaps daily.' }, 'system');
              }
            }
          } catch (e) {
            console.warn('Error renewing streak', e);
          }
          
          alert(`📸 Snap sent!`);
        } else {
          alert('User not found');
        }
      }
      snapPreview.style.display = 'none';
      snapRecipient.value = '';
    } catch (err) {
      alert('Error sending snap: ' + (err.message || err));
    }
    finally {
      // restore button state
      sendSnapBtn.disabled = false; sendSnapBtn.textContent = 'Send Snap';
    }
  });

  // Music picker and audio attach handlers
  if (openMusicPickerBtn && musicPickerModal) {
    openMusicPickerBtn.addEventListener('click', () => { musicPickerModal.style.display = 'flex'; });
  }
  if (closeMusicPicker && musicPickerModal) {
    closeMusicPicker.addEventListener('click', () => { musicPickerModal.style.display = 'none'; });
  }
  if (spotifyConnectBtn) {
    spotifyConnectBtn.addEventListener('click', async () => {
      try {
        // Create a short-lived session on the server which returns the authorize URL
        const res = await fetch('/api/spotify/session', { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${currentToken}` } });
        if (!res.ok) {
          const t = await res.text().catch(()=>'');
          return alert('Failed to create Spotify session: ' + t);
        }
        const j = await res.json();
        const url = j.url;
        const w = window.open(url, 'spotify_connect', 'width=800,height=700');
        if (!w) return alert('Popup blocked. Please allow popups to connect Spotify.');
        // poll for popup closed
        const poll = setInterval(() => { if (w.closed) { clearInterval(poll); updateProfile(); alert('Spotify window closed'); } }, 1000);
      } catch (e) { console.warn('Spotify connect error', e); alert('Failed to start Spotify connect'); }
    });
  }

  async function searchSpotify(q) {
    if (!q) return;
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const txt = await res.text().catch(()=>'');
        return alert('Spotify search failed: ' + txt);
      }
      const tracks = await res.json();
      musicList.innerHTML = '';
      if (!tracks || tracks.length === 0) return musicList.innerHTML = '<p style="text-align:center;color:#999;">No tracks found</p>';
      tracks.forEach(t => {
        const el = document.createElement('div');
        el.className = 'music-item';
        el.dataset.id = t.id; el.dataset.name = t.name; el.dataset.artist = t.artists; el.dataset.preview = t.preview_url || '';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${t.name}</strong><div style="font-size:13px;color:var(--muted);">${t.artists}</div></div><div style="display:flex;gap:8px;align-items:center;"><button class="preview-music-btn gold-btn" type="button" data-preview="${t.preview_url || ''}">▶️</button><button class="select-music-btn gold-btn" type="button">Select</button></div></div>`;
        musicList.appendChild(el);
      });
      // Re-bind handlers for new list
      musicList.querySelectorAll('.select-music-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const item = btn.closest('.music-item');
          if (!item) return;
          const obj = { id: item.dataset.id, name: item.dataset.name, artist: item.dataset.artist, previewUrl: item.dataset.preview || '' };
          if (selectedMusicInput) selectedMusicInput.value = JSON.stringify(obj);
          if (selectedMusicDisplay) selectedMusicDisplay.textContent = obj.name + ' — ' + obj.artist;
          if (musicPickerModal) musicPickerModal.style.display = 'none';
        });
      });
      musicList.querySelectorAll('.preview-music-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const preview = btn.dataset.preview || btn.getAttribute('data-preview') || '';
          if (!preview) return alert('No preview available for this track');
          try {
            if (!musicPreviewAudio) musicPreviewAudio = new Audio();
            if (musicPreviewAudio.src === preview && !musicPreviewAudio.paused) { musicPreviewAudio.pause(); btn.textContent = '▶️'; return; }
            musicPreviewAudio.src = preview;
            musicPreviewAudio.play().catch(() => {});
            // set other preview buttons to play icon
            musicList.querySelectorAll('.preview-music-btn').forEach(b => b.textContent = '▶️');
            btn.textContent = '⏸';
            musicPreviewAudio.onended = () => { btn.textContent = '▶️'; };
          } catch (e) { console.warn('Preview play error', e); }
        });
      });
    } catch (e) { console.warn('Spotify search error', e); alert('Spotify search failed'); }
  }
  if (musicSearchBtn && musicSearchInput) {
    musicSearchBtn.addEventListener('click', () => { const q = musicSearchInput.value.trim(); if (q) searchSpotify(q); });
    musicSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); musicSearchBtn.click(); } });
  }
  if (musicList) {
    musicList.querySelectorAll('.select-music-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = btn.closest('.music-item');
        if (!item) return;
        const obj = { id: item.dataset.id, name: item.dataset.name, artist: item.dataset.artist, previewUrl: item.dataset.preview || '' };
        if (selectedMusicInput) selectedMusicInput.value = JSON.stringify(obj);
        if (selectedMusicDisplay) selectedMusicDisplay.textContent = obj.name + ' — ' + obj.artist;
        if (musicPickerModal) musicPickerModal.style.display = 'none';
      });
    });
    musicList.querySelectorAll('.preview-music-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preview = btn.dataset.preview || btn.getAttribute('data-preview') || '';
        if (!preview) return alert('No preview available for this track');
        try {
          if (!musicPreviewAudio) musicPreviewAudio = new Audio();
          if (musicPreviewAudio.src === preview && !musicPreviewAudio.paused) { musicPreviewAudio.pause(); btn.textContent = '▶️'; return; }
          musicPreviewAudio.src = preview;
          musicPreviewAudio.play().catch(() => {});
          // set other preview buttons to play icon
          musicList.querySelectorAll('.preview-music-btn').forEach(b => b.textContent = '▶️');
          btn.textContent = '⏸';
          musicPreviewAudio.onended = () => { btn.textContent = '▶️'; };
        } catch (e) { console.warn('Preview play error', e); }
      });
    });
  }
  if (attachAudioBtn && snapAudioInput) {
    attachAudioBtn.addEventListener('click', () => snapAudioInput.click());
  }
  if (snapAudioInput) {
    snapAudioInput.addEventListener('change', () => {
      const f = snapAudioInput.files[0];
      if (f && selectedMusicDisplay) selectedMusicDisplay.textContent = 'Audio attached: ' + f.name;
    });
  }

  // ===== CHAT =====
  function selectChat(otherUserId, otherUsername, otherAvatar = '') {
    chatName.textContent = otherUsername;
    
    // Display profile picture in chat header
    const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
    if (chatHeaderAvatar) {
      if (otherAvatar) {
        chatHeaderAvatar.src = otherAvatar;
        chatHeaderAvatar.style.display = 'block';
      } else {
        chatHeaderAvatar.style.display = 'none';
      }
    }
    
    // Add click handler for profile
    const handleProfileClick = () => {
      showFriendProfile(otherUserId, otherUsername, otherAvatar);
    };
    chatName.onclick = handleProfileClick;
    if (chatHeaderAvatar) {
      chatHeaderAvatar.onclick = handleProfileClick;
    }
    
    // fetch streak info and flame health for header
    (async () => {
      try {
        const sres = await fetch(`/api/streaks/${otherUserId}/status`, { headers: { 'authorization': `Bearer ${currentToken}` } });
        if (sres.ok) {
          const s = await sres.json();
          // Update streak count
          const streakRes = await fetch(`/api/streaks/${otherUserId}`, { headers: { 'authorization': `Bearer ${currentToken}` } });
          if (streakRes.ok) {
            const streak = await streakRes.json();
            document.getElementById('chatStreak').textContent = `🔥 ${streak.streak?.streakCount || 0}`;
          }
          
          // Update flame health bar
          const flameBar = document.getElementById('chatFlameHealth');
          if (flameBar) {
            const health = s.flameHealth || 0;
            // Create filled/empty bar visualization
            const filled = Math.round(health / 10); // 10 blocks max
            const empty = 10 - filled;
            flameBar.textContent = '█'.repeat(filled) + '░'.repeat(empty);
            
            // Color based on health
            if (health > 70) flameBar.style.color = '#ff6b35'; // strong orange
            else if (health > 30) flameBar.style.color = '#ff8c00'; // orange
            else flameBar.style.color = '#ff0000'; // red (dying)
            
            // Show restore button if streak expired
            if (!s.isActive && s.timeLeft === 0) {
              showStreakRestoreOption(otherUserId);
            }
          }
        }
      } catch (e) { console.warn('Error loading streak status', e); }
    })();
    const convoId = [currentUserId, otherUserId].sort().join('-');
    messagesLog.innerHTML = '';
    chatDetail.classList.remove('hidden');
    chatDetail.style.display = 'block';

    // Load messages from server
    loadChatMessages(otherUserId, otherUsername, convoId);

    window.currentConvoId = convoId;
    window.currentOtherId = otherUserId;
    window.currentOtherUsername = otherUsername;

    // Mark chat as active
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-user-id="${otherUserId}"]`)?.classList.add('active');
  }
  
  function showStreakRestoreOption(otherUserId) {
    const modal = document.getElementById('streakRestoreModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    
    // Load restore counts
    fetch(`/api/streaks/${otherUserId}`, { headers: { 'authorization': `Bearer ${currentToken}` } })
      .then(r => r.json())
      .then(data => {
        const restoreInfo = data.restoreInfo || {};
        const restoreBtnText = document.getElementById('restoreCountText');
        if (restoreBtnText) {
          restoreBtnText.textContent = `(${restoreInfo.remaining || 0} left)`;
        }
      });
  }

  async function loadChatMessages(otherUserId, otherUsername, convoId) {
    try {
      const res = await fetch(`${API_PREFIX}/messages/${otherUserId}`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) return;
      
      const msgs = await res.json();
      messagesLog.innerHTML = '';
      
      // Mark unread messages as read
      const unreadIds = msgs.filter(m => m.from !== currentUserId && (!m.readBy || !m.readBy.includes(currentUserId))).map(m => m.id);
      if (unreadIds.length > 0) {
        fetch(`${API_PREFIX}/messages/read`, {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ messageIds: unreadIds, conversationId: convoId })
        }).catch(e => console.warn('Failed to mark messages as read', e));
      }

      msgs.forEach(msg => {
        const sender = msg.from === currentUserId ? currentUser.username : otherUsername;
        const side = msg.from === currentUserId ? 'own' : 'other';
        const readStatus = msg.readBy && msg.readBy.length > 1 ? ' ✓✓' : msg.readBy && msg.readBy.includes(otherUserId) ? ' ✓' : '';
        appendMessage(sender, { type: msg.type || 'text', content: msg.content || msg.text || '' }, side, readStatus, 'sent', msg.id || msg.messageId || null);
      });

      // Scroll to bottom after loading all messages
      setTimeout(() => {
        messagesLog.scrollTop = messagesLog.scrollHeight;
      }, 0);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }

  function appendMessage(sender, payload, side, readStatus = '', messageStatus = 'sent', messageId = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${side}`;
    msgDiv.dataset.messageStatus = messageStatus; // for tracking status
    // assign a stable message id (server-provided or generated)
    const mid = messageId || generateMessageId();
    msgDiv.dataset.messageId = mid;
    let contentNode;
    if (payload && typeof payload === 'object' && payload.type) {
      const t = payload.type;
      const c = payload.content;
      if (t === 'text' || t === 'emoji') {
        contentNode = document.createElement('span');
        contentNode.textContent = c;
        if (t === 'emoji') contentNode.style.fontSize = '22px';
      } else if (t === 'sticker') {
        contentNode = document.createElement('img');
        contentNode.src = c;
        contentNode.style.width = '120px';
        contentNode.style.borderRadius = '8px';
      } else if (t === 'image') {
        contentNode = document.createElement('img');
        contentNode.src = c;
        contentNode.style.maxWidth = '280px';
        contentNode.style.maxHeight = '280px';
        contentNode.style.borderRadius = '8px';
        contentNode.style.objectFit = 'cover';
      } else if (t === 'video') {
        contentNode = document.createElement('video');
        contentNode.src = c;
        contentNode.controls = true;
        contentNode.style.maxWidth = '280px';
        contentNode.style.maxHeight = '280px';
        contentNode.style.borderRadius = '8px';
      } else if (t === 'audio') {
        contentNode = document.createElement('audio');
        contentNode.controls = true;
        contentNode.src = c;
      } else if (t === 'document' || t === 'file') {
        contentNode = document.createElement('div');
        contentNode.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; gap: 8px;';
        const icon = document.createElement('span');
        icon.textContent = '📄';
        icon.style.fontSize = '20px';
        const name = document.createElement('a');
        name.href = c;
        name.download = true;
        name.style.color = 'var(--accent)';
        name.style.textDecoration = 'none';
        name.textContent = 'Download File';
        contentNode.appendChild(icon);
        contentNode.appendChild(name);
      } else {
        contentNode = document.createElement('span');
        contentNode.textContent = c;
      }
    } else {
      contentNode = document.createElement('span');
      contentNode.textContent = payload || '';
    }

    msgDiv.appendChild(contentNode);
    
      // Ensure message is positioned for reaction overlay
      msgDiv.style.position = 'relative';

      // Add message status indicator for own messages
    if (side === 'own') {
      const statusDiv = document.createElement('div');
      statusDiv.className = `message-status ${messageStatus}`;
      statusDiv.dataset.status = messageStatus;
      msgDiv.appendChild(statusDiv);
    }

    if (readStatus) {
      const rs = document.createElement('small');
      rs.style.cssText = 'font-size:10px;opacity:0.7;margin-left:6px;';
      rs.textContent = readStatus;
      msgDiv.appendChild(rs);
    }

    // Add reactions container
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'message-reactions';
    reactionsDiv.style.display = 'flex';
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    reactions.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.textContent = emoji;
      btn.setAttribute('data-emoji', emoji);
      btn.setAttribute('data-count', '0');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addReactionToMessage(msgDiv, emoji);
      });
      reactionsDiv.appendChild(btn);
    });
    msgDiv.appendChild(reactionsDiv);

    // Append message and only auto-scroll if user is near the bottom or pin is enabled
    const wasNearBottom = (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < SCROLL_THRESHOLD;
    messagesLog.appendChild(msgDiv);
    if (pinScrollEnabled || wasNearBottom || side === 'own') {
      messagesLog.scrollTop = messagesLog.scrollHeight;
      if (newMessageIndicator) newMessageIndicator.classList.add('hidden');
      unseenCount = 0;
      if (newMessageCountEl) newMessageCountEl.textContent = '0';
    } else {
      // If user is reading older messages, show an unobtrusive indicator
      if (newMessageIndicator && side !== 'own') {
        unseenCount += 1;
        if (newMessageCountEl) newMessageCountEl.textContent = unseenCount > 99 ? '99+' : String(unseenCount);
        newMessageIndicator.classList.remove('hidden');
        newMessageIndicator.classList.add('pulse');
        newMessageIndicator.setAttribute('aria-hidden', 'false');
      }
    }
    // Return the created message element so callers can update status or attach metadata
    return msgDiv;
  }

  // Expose appendMessage to other components that may call it (chat_component)
  try { window.appendMessage = appendMessage; } catch(e){}

  // Helper to determine if user is near bottom
  function isUserAtBottom() {
    return (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < SCROLL_THRESHOLD;
  }

  // Scroll listener to hide indicator when user scrolls to bottom
  if (messagesLog) {
    messagesLog.addEventListener('scroll', () => {
      if (isUserAtBottom()) {
        if (newMessageIndicator) {
          newMessageIndicator.classList.add('hidden');
          newMessageIndicator.classList.remove('pulse');
          newMessageIndicator.setAttribute('aria-hidden', 'true');
        }
        unseenCount = 0;
        if (newMessageCountEl) newMessageCountEl.textContent = '0';
      }
    });
  }

  // Click handler for the indicator to jump to bottom
  if (newMessageIndicator) {
    newMessageIndicator.addEventListener('click', () => {
      messagesLog.scrollTop = messagesLog.scrollHeight;
      newMessageIndicator.classList.add('hidden');
      newMessageIndicator.classList.remove('pulse');
      newMessageIndicator.setAttribute('aria-hidden', 'true');
      unseenCount = 0;
      if (newMessageCountEl) newMessageCountEl.textContent = '0';
    });
    newMessageIndicator.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        messagesLog.scrollTop = messagesLog.scrollHeight;
        newMessageIndicator.classList.add('hidden');
        newMessageIndicator.classList.remove('pulse');
        newMessageIndicator.setAttribute('aria-hidden', 'true');
        unseenCount = 0;
        if (newMessageCountEl) newMessageCountEl.textContent = '0';
      }
    });
  }

  // Pin-to-bottom toggle behavior
  if (pinScrollBtn) {
    pinScrollBtn.addEventListener('click', () => {
      pinScrollEnabled = !pinScrollEnabled;
      pinScrollBtn.setAttribute('aria-pressed', pinScrollEnabled ? 'true' : 'false');
      try { localStorage.setItem('pinScrollEnabled', pinScrollEnabled ? 'true' : 'false'); } catch (e) {}
      if (pinScrollEnabled) {
        // when enabling pin, immediately jump to bottom and hide indicator
        messagesLog.scrollTop = messagesLog.scrollHeight;
        if (newMessageIndicator) {
          newMessageIndicator.classList.add('hidden');
          newMessageIndicator.classList.remove('pulse');
          newMessageIndicator.setAttribute('aria-hidden', 'true');
        }
        unseenCount = 0;
        if (newMessageCountEl) newMessageCountEl.textContent = '0';
      }
    });
  }

  window.addReactionToMessage = function(msgEl, emoji) {
    const reactionsDiv = msgEl.querySelector('.message-reactions');
    if (!reactionsDiv) return;
    
    const btn = reactionsDiv.querySelector(`[data-emoji="${emoji}"]`);
    if (btn) {
      let count = parseInt(btn.dataset.count || 1) + 1;
      btn.dataset.count = count;
      btn.innerHTML = emoji + '<span class="reaction-count">' + count + '</span>';
    } else {
      const btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.setAttribute('data-emoji', emoji);
      btn.setAttribute('data-count', '1');
      btn.innerHTML = emoji + '<span class="reaction-count">1</span>';
      reactionsDiv.appendChild(btn);
    }
  };

  // Notification handler
  function showNotification(title, options = {}) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%230a0e27" width="180" height="180"/><text x="90" y="120" font-size="80" font-weight="900" text-anchor="middle" fill="%23d4af37">✨</text></svg>',
        badge: '✨',
        ...options
      });
    }
  }

  // Function to update message status
  function updateMessageStatus(messageEl, status) {
    if (!messageEl) return;
    const statusDiv = messageEl.querySelector('.message-status');
    if (statusDiv) {
      statusDiv.className = `message-status ${status}`;
      statusDiv.dataset.status = status;
    }
  }

  // Function to update unread badge
  function updateUnreadBadge(userId, count) {
    const chatItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (!chatItem) return;
    const badge = chatItem.querySelector('.chat-unread-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    if (!window.currentOtherId) {
      alert('Please select a chat first');
      return;
    }

    messageInput.value = '';
    messageInput.disabled = true;
    autoResizeTextarea();
    const clientId = generateMessageId();
    const msgEl = appendMessage(currentUser.username, { type: 'text', content: text }, 'own', '', 'sending', clientId);

    try {
      const res = await fetch(`${API_PREFIX}/messages`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ toId: window.currentOtherId, type: 'text', text: text })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send');
      }

      const resJson = await res.json().catch(() => ({}));
      const serverMessageId = resJson.id || resJson.messageId || (resJson.message && resJson.message.id) || null;
      if (serverMessageId) {
        try { msgEl.dataset.messageId = serverMessageId; } catch(e){}
      }

      // Update status to sent
      updateMessageStatus(msgEl, 'sent');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', toId: window.currentOtherId, message: { type: 'text', content: text }, clientId }));
      }
      // award tiny points for sending a message
      fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 1 }) }).catch(()=>{});
    } catch (err) {
      console.error('Error sending message:', err);
      updateMessageStatus(msgEl, 'failed');
      alert('Failed to send message: ' + err.message);
    } finally {
      messageInput.disabled = false;
      messageInput.focus();
    }
  });

  // Auto-resize textarea based on content
  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    const newHeight = Math.min(messageInput.scrollHeight, 120);
    messageInput.style.height = newHeight + 'px';
  }

  messageInput.addEventListener('input', autoResizeTextarea);
  
  // Initialize textarea height
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';

  // Camera button for sending images/videos in chat (message-form button uses id 'msgCameraBtn')
  const messageMediaBtn = document.getElementById('msgCameraBtn');
  const chatMediaInput = document.getElementById('chatMediaInput');
  
  if (messageMediaBtn) {
    messageMediaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chatMediaInput.click();
    });
  }

  if (chatMediaInput) {
    chatMediaInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.currentOtherId) {
        alert('Please select a chat first');
        chatMediaInput.value = '';
        return;
      }

      try {
        messageInput.disabled = true;
        // uploadFile handles presigned PUT and returns cdnUrl; fallback to dataURL/CDN flow if needed
        let mediaUrl = '';
        try {
          const up = await uploadFile(file);
          if (up && up.success && up.cdnUrl) mediaUrl = up.cdnUrl;
        } catch (e) { console.warn('uploadFile failed', e); }

        if (!mediaUrl) {
          // fallback: read as dataURL and use uploadMediaToCDN
          const rd = await new Promise((resolve, reject) => {
            const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
          });
          const pres = await uploadMediaToCDN(rd, file.name || 'upload.jpg');
          mediaUrl = pres.url || rd;
        }

        if (mediaUrl) {
          let msgType = 'file';
          if (file.type.startsWith('image/')) msgType = 'image';
          else if (file.type.startsWith('video/')) msgType = 'video';
          else if (file.type.startsWith('audio/')) msgType = 'audio';
          else msgType = 'document';
          
          // optimistic message with clientId for reconciliation
          const clientId = generateMessageId();
          const msgEl = appendMessage(currentUser.username, { type: msgType, content: mediaUrl }, 'own', '', 'sending', clientId);

          const res = await fetch(`${API_PREFIX}/messages`, {
            method: 'POST',
            headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ toId: window.currentOtherId, type: msgType, content: mediaUrl, clientId })
          });

          if (!res.ok) throw new Error('Failed to send');
          const resJson = await res.json().catch(() => ({}));
          const serverMessageId = resJson.id || resJson.messageId || (resJson.message && resJson.message.id) || null;
          if (serverMessageId) {
            try { msgEl.dataset.messageId = serverMessageId; } catch(e){}
          }
          
          updateMessageStatus(msgEl, 'sent');

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', toId: window.currentOtherId, message: { type: msgType, content: mediaUrl }, clientId }));
          }

          fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 2 }) }).catch(()=>{});
        }
      } catch (err) {
        console.error('Error sending file:', err);
        alert('Failed to send file: ' + err.message);
      } finally {
        messageInput.disabled = false;
        messageInput.focus();
        chatMediaInput.value = '';
      }
    });
  }

  backToChats.addEventListener('click', () => {
    chatDetail.classList.add('hidden');
    chatDetail.style.display = 'none';
  });

  // Populate friend list in chats view
  async function loadChatsList() {
    try {
      const res = await fetch(`${API_PREFIX}/friends`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) return;
      // robustly parse JSON to avoid crashes on bad control characters
      const raw = await res.text();
      let friends = [];
      try {
        friends = JSON.parse(raw || '[]');
      } catch (e) {
        // try to sanitize control characters (common cause of JSON.parse failures)
        try {
          const cleaned = raw.replace(/[ -]+/g, '');
          friends = JSON.parse(cleaned || '[]');
        } catch (e2) {
          console.warn('Failed to parse friends list JSON, raw length:', raw && raw.length);
          friends = [];
        }
      }
      chatsList.innerHTML = '';
      
      if (friends.length === 0) {
        chatsList.innerHTML = '<p style="padding:12px;text-align:center;color:#999;">No friends yet. Add some to chat!</p>';
        return;
      }

      for (const friend of friends) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.userId = friend.userId;
        
        // Fetch streak for this friend
        let streakCount = 0;
        try {
          const streakRes = await fetch(`/api/streaks/${friend.userId}`, {
            headers: { 'authorization': `Bearer ${currentToken}` }
          });
          if (streakRes.ok) {
            const streakData = await streakRes.json();
            streakCount = streakData.streak?.streakCount || 0;
          }
        } catch (e) {}
        
        const streakBadge = streakCount > 0 ? `<span style="font-size:12px;color:#ff8c00;font-weight:600;margin-left:auto;">🔥 ${streakCount}</span>` : '';
        
        // Use avatar if available, otherwise use initial
        const avatarContent = friend.avatar ? 
          `<img src="${friend.avatar}" alt="${friend.username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` :
          `${friend.username.charAt(0).toUpperCase()}`;
        
        chatItem.innerHTML = `
          <div class="chat-avatar">${avatarContent}</div>
          <div class="chat-preview">
            <div class="chat-preview-name">${friend.username}</div>
            <div class="chat-preview-msg">${friend.bio || 'No bio'}</div>
          </div>
          <div class="chat-unread-badge" style="display:none;">0</div>
          ${streakBadge}
        `;
        chatItem.addEventListener('click', () => {
          selectChat(friend.userId, friend.username, friend.avatar);
        });
        chatsList.appendChild(chatItem);
      }
    } catch (err) {
      console.error('Error loading friends list:', err);
    }
  }

  // Load call history and render into callsView
  async function loadCallsList() {
    if (!callsList) return;
    try {
      const res = await fetch(`${API_PREFIX}/calls`, { headers: { 'authorization': `Bearer ${currentToken}` } });
      if (!res.ok) {
        callsList.innerHTML = '<div style="padding:12px;color:#999;">Unable to load call history.</div>';
        return;
      }
      const raw = await res.text();
      let calls = [];
      try { calls = JSON.parse(raw || '[]'); } catch (e) {
        try { const cleaned = raw.replace(/[\u0000-\u001F]+/g, ''); calls = JSON.parse(cleaned || '[]'); } catch (e2) { calls = []; }
      }

      callsList.innerHTML = '';
      if (!Array.isArray(calls) || calls.length === 0) {
        document.getElementById('noCalls').classList.remove('hidden');
        return;
      }
      document.getElementById('noCalls').classList.add('hidden');

      for (const c of calls) {
        const item = document.createElement('div');
        item.className = 'call-item';
        const ts = c.timestamp ? new Date(c.timestamp) : new Date();
        const duration = Number(c.duration || c.durationSeconds || c.seconds || 0);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const minutesText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const who = c.fromUsername || c.from || c.caller || 'Unknown';
        const dir = c.direction || (c.from === currentUserId ? 'Outgoing' : 'Incoming');
        const type = c.callType || c.type || 'audio';
        item.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);">
            <div style="display:flex;gap:12px;align-items:center;">
              <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-weight:700;">${(who||'U').charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight:700">${escapeHtml(who)}</div>
                <div style="font-size:12px;color:#bbb">${dir} • ${type}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:600">${minutesText}</div>
              <div style="font-size:12px;color:#999">${ts.toLocaleString()}</div>
            </div>
          </div>
        `;
        callsList.appendChild(item);
      }
    } catch (err) {
      console.error('Error loading call history:', err);
      callsList.innerHTML = '<div style="padding:12px;color:#999;">Error loading calls.</div>';
    }
  }

  // Improved new chat button with search
  newChatBtn.addEventListener('click', async () => {
    const choice = prompt('Search for a user (enter username) or type "group" to create a group:');
    if (!choice) return;

    if (choice.toLowerCase() === 'group') {
      showGroupCreationModal();
    } else {
      try {
        const res = await fetch(`${API_PREFIX}/search?q=${encodeURIComponent(choice)}`, {
          headers: { 'authorization': `Bearer ${currentToken}` }
        });
        const results = await res.json();
        
        if (results.length === 0) {
          alert('User not found');
          return;
        }

        const user = results[0];
        selectChat(user.userId, user.username, user.avatar);
        await loadChatsList();
      } catch (err) {
        alert('Error searching for user: ' + err.message);
      }
    }
  });

  // ===== GROUP CHAT =====
  const groupCreationModal = document.getElementById('groupCreationModal');
  const groupCreationForm = document.getElementById('groupCreationForm');
  const groupName = document.getElementById('groupName');
  const groupMembersList = document.getElementById('groupMembersList');

  async function showGroupCreationModal() {
    if (!groupCreationModal) return;

    // Load friends to select as members
    try {
      const res = await fetch(`${API_PREFIX}/friends`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) return;

      const friends = await res.json();
      groupMembersList.innerHTML = '';

      friends.forEach(friend => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:6px;transition:background 0.2s;';
        label.innerHTML = `
          <input type="checkbox" value="${friend.userId}" style="cursor:pointer;">
          <span>${friend.username}</span>
        `;
        label.addEventListener('mouseenter', () => label.style.background = 'rgba(212,175,55,0.1)');
        label.addEventListener('mouseleave', () => label.style.background = 'transparent');
        groupMembersList.appendChild(label);
      });

      groupCreationModal.style.display = 'flex';
    } catch (err) {
      alert('Error loading friends: ' + err.message);
    }
  }

  if (groupCreationForm) {
    groupCreationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = groupName.value.trim();
      if (!name) return alert('Enter a group name');

      const selectedMembers = Array.from(groupMembersList.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);

      try {
        const res = await fetch(`${API_PREFIX}/messages/groups`, {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ name, memberIds: selectedMembers })
        });

        if (!res.ok) throw new Error('Failed to create group');

        const { groupId } = await res.json();
        groupCreationModal.style.display = 'none';
        groupName.value = '';
        groupMembersList.innerHTML = '';
        alert('✨ Group created!');
        await loadChatsList();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  const groupCloseBtn = groupCreationModal?.querySelector('.close-modal-btn');
  if (groupCloseBtn) {
    groupCloseBtn.addEventListener('click', () => {
      groupCreationModal.style.display = 'none';
      groupName.value = '';
      groupMembersList.innerHTML = '';
    });
  }

  // ===== PROFILE =====
  function updateProfile() {
    profileAvatar.src = currentUser.avatar;
    profileName.textContent = currentUser.username;
    profileBio.textContent = currentUser.bio;
    friendCount.textContent = currentUser.friends?.length || 0;
    storyCount.textContent = Math.floor(Math.random() * 10);
    
    // Fetch and display Wimp Score
    fetch(`/api/scores/${currentUserId}`, { headers: { 'authorization': `Bearer ${currentToken}` } })
      .then(r => r.json())
      .then(data => {
        const profileWimpScore = document.getElementById('profileWimpScore');
        if (profileWimpScore) {
          profileWimpScore.textContent = data.wimpScore || 0;
        }
      })
      .catch(e => console.warn('Error loading wimp score', e));
    
    // Fetch and display highest active streak
    (async () => {
      try {
        const msgs = await fetch(`${API_PREFIX}/messages/${currentUserId}`);
        const data = await msgs.json();
        let maxStreak = 0;
        
        if (Array.isArray(data)) {
          // Get all unique conversation partners
          const partners = new Set();
          data.forEach(msg => {
            partners.add(msg.from === currentUserId ? msg.to : msg.from);
          });
          
          // Get streak counts from each partner
          for (const partnerId of partners) {
            try {
              const streakRes = await fetch(`/api/streaks/${partnerId}`, {
                headers: { 'authorization': `Bearer ${currentToken}` }
              });
              if (streakRes.ok) {
                const streak = await streakRes.json();
                const count = streak.streak?.streakCount || 0;
                if (count > maxStreak) maxStreak = count;
              }
            } catch (e) {}
          }
        }
        
        const profileStreakCount = document.getElementById('profileStreakCount');
        if (profileStreakCount) {
          profileStreakCount.textContent = maxStreak;
        }
      } catch (e) {
        console.warn('Error loading streak count', e);
      }
    })();
  }

  const editAvatarPreview = document.getElementById('editAvatarPreview');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const editUsername = document.getElementById('editUsername');
  const editLocation = document.getElementById('editLocation');
  const editWebsite = document.getElementById('editWebsite');
  const editPrivateAccount = document.getElementById('editPrivateAccount');

  editAvatarPreview.addEventListener('click', () => avatarFileInput.click());

  avatarFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      editAvatarPreview.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  editProfileBtn.addEventListener('click', () => {
    editUsername.value = currentUser.username || '';
    editBio.value = currentUser.bio || '';
    editLocation.value = currentUser.location || '';
    editWebsite.value = currentUser.website || '';
    editPrivateAccount.checked = currentUser.privateAccount || false;
    editAvatarPreview.src = currentUser.avatar || 'https://i.pravatar.cc/150?u=' + (currentUser.email || 'user');
    editProfileModal.style.display = 'block';
  });

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        username: editUsername.value || currentUser.username,
        bio: editBio.value,
        location: editLocation.value,
        website: editWebsite.value,
        privateAccount: editPrivateAccount.checked,
        avatar: editAvatarPreview.src !== '' ? editAvatarPreview.src : currentUser.avatar
      };

      const res = await fetch(`/api/users/${currentUserId}`, {
        method: 'PUT',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      currentUser = { ...currentUser, ...updated };
      saveSession();
      updateProfile();
      editProfileModal.style.display = 'none';
      avatarFileInput.value = '';
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Error updating profile: ' + err.message);
    }
  });

  // ===== FRIENDS =====
  async function loadFriends() {
    try {
      const res = await fetch('/api/friends', {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      const friends = await res.json();
      currentUser.friends = friends.map(f => f.userId);
      updateProfile();
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  }

  const friendsModal = document.getElementById('friendsModal');
  const addFriendForm = document.getElementById('addFriendForm');
  const friendInput = document.getElementById('friendInput');
  const friendsList = document.getElementById('friendsList');
  const closeModalBtn = document.querySelector('.close-modal-btn');
  const addFriendsBtn = document.getElementById('addFriendsBtn');

  addFriendsBtn.addEventListener('click', () => {
    friendsModal.style.display = 'block';
    displayFriends();
  });

  addFriendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = friendInput.value.trim();
    if (!query) return;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      const results = await res.json();
      
      if (results.length === 0) {
        alert('No users found');
        return;
      }

      const user = results[0];
      if (user.isFriend) {
        alert('Already friends with this user');
        return;
      }

      const addRes = await fetch('/api/friends/requests/send', {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ targetId: user.userId })
      });

      if (!addRes.ok) {
        const err = await addRes.json();
        throw new Error(err.error || 'Failed to send request');
      }

      friendInput.value = '';
      alert(`✨ Friend request sent to ${user.username}!`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  function displayFriends() {
    friendsList.innerHTML = '';
    if (!currentUser.friends || currentUser.friends.length === 0) {
      friendsList.innerHTML = '<p style="text-align:center;color:#999;">No friends yet. Add one!</p>';
      return;
    }

    currentUser.friends.forEach(friendId => {
      // In a real app, you'd fetch friend details. For now, show the ID
      const item = document.createElement('div');
      item.className = 'friend-item';
      item.innerHTML = `
        <div class="friend-info">
          <div class="friend-name">Friend ${friendId.substring(0, 6)}</div>
          <div class="friend-detail">ID: ${friendId}</div>
        </div>
        <div class="friend-actions">
          <button onclick="removeFriend('${friendId}')">Remove</button>
        </div>
      `;
      friendsList.appendChild(item);
    });
  }

  window.removeFriend = async function(friendId) {
    if (confirm('Remove this friend?')) {
      try {
        const res = await fetch('/api/friends/remove', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ targetId: friendId })
        });
        if (res.ok) {
          await loadFriends();
          displayFriends();
          alert('Friend removed');
        }
      } catch (err) {
        alert('Error removing friend');
      }
    }
  };

  closeModalBtn.addEventListener('click', () => {
    friendsModal.style.display = 'none';
  });

  // ===== STREAK RESTORE MODAL =====
  const streakRestoreModal = document.getElementById('streakRestoreModal');
  const useRestoreBtn = document.getElementById('useRestoreBtn');
  const buyRestoreBtn = document.getElementById('buyRestoreBtn');
  const streakRestoreCloseBtn = streakRestoreModal?.querySelector('.close-modal-btn');

  if (useRestoreBtn) {
    useRestoreBtn.addEventListener('click', async () => {
      const otherId = window.currentOtherId;
      if (!otherId) return alert('No chat selected');
      
      try {
        const res = await fetch('/api/streaks/restore', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ otherId })
        });
        
        if (!res.ok) {
          const err = await res.json();
          if (res.status === 402) {
            alert('No free restores left. Purchase premium restores?');
            return;
          }
          throw new Error(err.error || 'Failed to restore streak');
        }
        
        const data = await res.json();
        alert('🔥 Streak restored! Keep it alive by sending snaps daily.');
        appendMessage('System', { type: 'text', content: '🔥 Streak restored!' }, 'system');
        
        // Close modal and refresh
        streakRestoreModal.classList.add('hidden');
        selectChat(otherId, window.currentOtherUsername);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  if (buyRestoreBtn) {
    buyRestoreBtn.addEventListener('click', async () => {
      // TODO: Integrate with Stripe or payment processor
      const otherId = window.currentOtherId;
      if (!otherId) return alert('No chat selected');
      
      try {
        const res = await fetch('/api/streaks/restore-premium', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ otherId })
        });
        
        if (!res.ok) {
          throw new Error('Payment processing failed');
        }
        
        const data = await res.json();
        alert('✨ Premium restore activated! Unlimited restores for this streak.');
        appendMessage('System', { type: 'text', content: '✨ Premium streak restore activated!' }, 'system');
        
        // Close modal and refresh
        streakRestoreModal.classList.add('hidden');
        selectChat(otherId, window.currentOtherUsername);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  if (streakRestoreCloseBtn) {
    streakRestoreCloseBtn.addEventListener('click', () => {
      streakRestoreModal.classList.add('hidden');
    });
  }

  // ===== RECOMMENDATIONS =====
  const noRecommendations = document.getElementById('noRecommendations');

  async function loadRecommendations() {
    try {
      const res = await fetch(`${API_PREFIX}/recommendations`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      const recommendations = await res.json();

      recommendationsList.innerHTML = '';
      
      if (recommendations.length === 0) {
        noRecommendations.classList.remove('hidden');
        return;
      }

      noRecommendations.classList.add('hidden');

      recommendations.forEach(user => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        const genderEmoji = user.gender === 'male' ? '♂️' : user.gender === 'female' ? '♀️' : '✨';
        
        card.innerHTML = `
          <img src="${user.avatar}" alt="" class="rec-avatar">
          <div class="rec-info">
            <h4>${user.username} ${genderEmoji}</h4>
            <p class="rec-bio">${user.bio}</p>
            <p class="rec-mutual">${user.mutualFriends > 0 ? `${user.mutualFriends} mutual friend${user.mutualFriends > 1 ? 's' : ''}` : 'No mutual friends'}</p>
          </div>
          <button class="rec-add-btn" onclick="sendFriendRequestFromRec('${user.userId}', '${user.username}')">📬 Send Request</button>
        `;
        recommendationsList.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  }

  window.addRecommendedFriend = async function(userId) {
    try {
      const res = await fetch(`${API_PREFIX}/friends/add`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ targetId: userId })
      });

      if (!res.ok) throw new Error('Failed to add friend');

      await loadFriends();
      await loadRecommendations();
      alert('✨ Friend added!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.sendFriendRequestFromRec = async function(userId, username) {
    try {
      const res = await fetch(`${API_PREFIX}/friends/requests/send`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ targetId: userId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send request');
      }

      await loadRecommendations();
      alert(`📬 Friend request sent to ${username}!`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  // ===== SETTINGS =====
  const settingsForm = document.getElementById('settingsForm');
  const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
  const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
  const avatarInput = document.getElementById('avatarInput');
  const avatarUploadProgress = document.getElementById('avatarUploadProgress');
  const avatarUploadBar = avatarUploadProgress && avatarUploadProgress.querySelector('.progress-bar');
  const settingsUsername = document.getElementById('settingsUsername');
  const settingsEmail = document.getElementById('settingsEmail');
  const settingsPhone = document.getElementById('settingsPhone');
  const settingsBio = document.getElementById('settingsBio');
  const bioCharCount = document.getElementById('bioCharCount');
  const settingsStatus = document.getElementById('settingsStatus');

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      const user = await res.json();

      settingsAvatarPreview.src = user.avatar;
      settingsUsername.value = user.username;
      settingsEmail.value = user.email;
      settingsPhone.value = user.phone || '';
      settingsBio.value = user.bio;
      updateBioCharCount();
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  uploadAvatarBtn.addEventListener('click', () => {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5000000) {
      alert('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      // show immediate preview
      settingsAvatarPreview.src = event.target.result;
      // start upload to CDN with progress
      if (!currentToken) return; // must be logged in
      // UI: indicate uploading
      uploadAvatarBtn.disabled = true; uploadAvatarBtn.textContent = 'Uploading...';
      if (avatarUploadProgress) avatarUploadProgress.classList.remove('hidden');
      try {
        // get presigned url
        const filename = file.name || 'avatar.jpg';
        const pkRes = await fetch('/api/upload/presign?filename=' + encodeURIComponent(filename) + '&contentType=' + encodeURIComponent(file.type), { headers: { 'authorization': `Bearer ${currentToken}` } });
        if (pkRes.ok) {
          const pres = await pkRes.json();
          // upload with XHR to track progress
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', pres.url);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable && avatarUploadBar) {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                avatarUploadBar.style.width = pct + '%';
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('Upload failed ' + xhr.status));
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
          });
          // update preview to public URL
          settingsAvatarPreview.src = pres.publicUrl;
        } else {
          // fallback to server-side CDN upload
          const fd = new FormData();
          fd.append('file', file);
          await fetch('/api/upload/cdn', { method: 'POST', headers: { 'authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ filename, data: event.target.result }) });
        }
      } catch (err) {
        console.error('Avatar upload error', err);
        alert('Avatar upload failed');
      } finally {
        uploadAvatarBtn.disabled = false; uploadAvatarBtn.textContent = '📷 Change Avatar';
        if (avatarUploadProgress) { setTimeout(() => { avatarUploadProgress.classList.add('hidden'); if (avatarUploadBar) avatarUploadBar.style.width = '0%'; }, 800); }
      }
    };
    reader.readAsDataURL(file);
  });

  settingsBio.addEventListener('input', updateBioCharCount);

  function updateBioCharCount() {
    const count = settingsBio.value.length;
    bioCharCount.textContent = `${count}/200 characters`;
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsStatus.classList.add('hidden');

    try {
      const updates = {
        username: settingsUsername.value.trim(),
        email: settingsEmail.value.trim(),
        phone: settingsPhone.value.trim(),
        bio: settingsBio.value.trim(),
        avatar: settingsAvatarPreview.src
      };

      // Validate
      if (!updates.username) {
        showSettingsStatus('Username required', 'error');
        return;
      }

      if (updates.username.length < 3) {
        showSettingsStatus('Username must be at least 3 characters', 'error');
        return;
      }

      if (updates.bio.length > 200) {
        showSettingsStatus('Bio too long (max 200 characters)', 'error');
        return;
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${currentToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const err = await res.json();
        showSettingsStatus(err.error, 'error');
        return;
      }

      const updated = await res.json();
      currentUser = updated;
      saveSession();
      updateProfile();

      showSettingsStatus('✨ Profile updated successfully!', 'success');
      setTimeout(() => {
        showSettingsStatus('', '');
      }, 3000);
    } catch (err) {
      showSettingsStatus('Error saving settings: ' + err.message, 'error');
    }
  });

  function showSettingsStatus(message, type) {
    settingsStatus.textContent = message;
    settingsStatus.className = 'status-message ' + type;
    if (message) {
      settingsStatus.classList.remove('hidden');
    } else {
      settingsStatus.classList.add('hidden');
    }
  }

  // ===== UPLOAD & MEDIA =====
  async function uploadFile(file) {
    try {
      // Get presigned URL from server
      const presignedRes = await fetch(`${API_PREFIX}/upload/presigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const { presignedUrl, cdnUrl } = await presignedRes.json();

      // Upload directly to S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      return { success: true, cdnUrl };
    } catch (err) {
      console.error('Upload error:', err);
      return { success: false, error: err.message };
    }
  }

  // ===== PAYMENTS =====
  async function loadPaymentPlans() {
    try {
      const res = await fetch(`${API_PREFIX}/payments/plans`);
      if (!res.ok) throw new Error('Failed to load plans');
      const plans = await res.json();
      return plans;
    } catch (err) {
      console.error('Load plans error:', err);
      return [];
    }
  }

  async function subscribeToplan(planId) {
    try {
      const res = await fetch(`${API_PREFIX}/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ planId })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Subscription failed');
      }

      const { clientSecret } = await res.json();
      return { success: true, clientSecret };
    } catch (err) {
      console.error('Subscribe error:', err);
      return { success: false, error: err.message };
    }
  }

  // ===== EMAIL VERIFICATION =====
  async function sendVerificationEmail() {
    try {
      const res = await fetch(`${API_PREFIX}/email/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send verification email');
      }

      return { success: true };
    } catch (err) {
      console.error('Verification email error:', err);
      return { success: false, error: err.message };
    }
  }

  async function verifyEmail(token) {
    try {
      const res = await fetch(`${API_PREFIX}/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Verification failed');
      }

      return { success: true };
    } catch (err) {
      console.error('Email verify error:', err);
      return { success: false, error: err.message };
    }
  }

  // ===== HELPERS =====
  function playNotification() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 800;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 50);
  }

  // ===== WIMPY INTEGRATION (client) =====
  async function loadWimpyConversations() {
    if (!wimpyConversationsList) return;
    wimpyConversationsList.innerHTML = '<p style="color:var(--muted);padding:8px;">Loading...</p>';
    try {
      const res = await fetch('/api/wimpy/conversations');
      if (!res.ok) { wimpyConversationsList.innerHTML = '<p style="color:#f88;padding:8px;">Failed to load</p>'; return; }
      const convos = await res.json();
      if (!Array.isArray(convos) || convos.length === 0) {
        wimpyConversationsList.innerHTML = '<p style="color:var(--muted);padding:8px;">No conversations yet. Click New Chat to start.</p>';
        wimpyMessagesLog && (wimpyMessagesLog.innerHTML = 'Open a conversation or create a new chat.');
        return;
      }
      wimpyConversationsList.innerHTML = '';
      convos.forEach(c => {
        const el = document.createElement('div');
        el.className = 'wimpy-convo-item';
        el.style.cssText = 'padding:8px;border-radius:6px;cursor:pointer;margin-bottom:6px;background:rgba(255,255,255,0.02);';
        const last = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
        el.innerHTML = `<div style="font-weight:600;">${c.conversationId || 'Conversation'}</div><div style="font-size:12px;color:var(--muted);">${last ? (last.text || '[media]') .toString().slice(0,80) : 'No messages yet'}</div>`;
        el.addEventListener('click', () => selectWimpyConversation(c.conversationId));
        wimpyConversationsList.appendChild(el);
      });
    } catch (e) {
      console.warn('loadWimpyConversations error', e);
      wimpyConversationsList.innerHTML = '<p style="color:#f88;padding:8px;">Error loading conversations</p>';
    }
  }

  async function selectWimpyConversation(conversationId) {
    if (!wimpyMessagesLog) return;
    wimpyMessagesLog.innerHTML = '';
    try {
      const res = await fetch(`/api/wimpy/conversations/${encodeURIComponent(conversationId)}`);
      if (!res.ok) { wimpyMessagesLog.innerHTML = '<p style="color:#f88;padding:8px;">Failed to load conversation</p>'; return; }
      const convo = await res.json();
      convo.messages.forEach(m => {
        const side = (m.from === 'wimpy') ? 'other' : (m.from === currentUserId ? 'own' : 'other');
        const who = m.from === 'wimpy' ? 'Wimpy' : (m.from === currentUserId ? currentUser.username : m.from);
        appendWimpyMessage(who, m.text || (m.media ? '[media]' : ''), side, m.id);
      });
      window.currentWimpyConvoId = conversationId;
      setTimeout(() => { wimpyMessagesLog.scrollTop = wimpyMessagesLog.scrollHeight; }, 50);
    } catch (e) { console.warn('selectWimpyConversation error', e); wimpyMessagesLog.innerHTML = '<p style="color:#f88;padding:8px;">Error</p>'; }
  }

  function appendWimpyMessage(sender, text, side = 'other', messageId = null) {
    if (!wimpyMessagesLog) return null;
    const el = document.createElement('div');
    el.className = 'message ' + (side === 'own' ? 'own' : 'other');
    const mid = messageId || generateMessageId();
    el.dataset.messageId = mid;
    el.style.marginBottom = '8px';
    const content = document.createElement('div'); content.className = 'content';
    content.innerHTML = `<strong style="display:block;margin-bottom:4px;">${escapeHtml(sender)}</strong><div>${escapeHtml(text || '')}</div>`;
    el.appendChild(content);
    wimpyMessagesLog.appendChild(el);
    wimpyMessagesLog.scrollTop = wimpyMessagesLog.scrollHeight;
    return el;
  }

  if (wimpyForm) {
    wimpyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (wimpyInput && wimpyInput.value || '').trim();
      if (!text) return;
      const convoId = window.currentWimpyConvoId || null;
      const clientEl = appendWimpyMessage(currentUser.username || 'You', text, 'own', generateMessageId());
      if (wimpyInput) { wimpyInput.value = ''; wimpyInput.disabled = true; }
      try {
        // If a media file is selected, upload it first and attach the returned URL
        let media = null;
        const mediaInput = document.getElementById('wimpyMediaInput');
        if (mediaInput && mediaInput.files && mediaInput.files.length) {
          const f = mediaInput.files[0];
          // read as data URL
          const reader = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(f);
          }).catch((err)=>{ console.warn('read file failed', err); return null; });
          if (reader) {
            // upload to CDN (presign or server fallback)
            const up = await uploadMediaToCDN(reader, f.name || 'wimpy_upload');
            media = up && (up.url || up.publicUrl) ? (up.url || up.publicUrl) : reader;
          }
          // clear selection
          try { mediaInput.value = ''; } catch (e) {}
        }

        const payload = { conversationId: convoId, text };
        if (media) payload.media = media;

        const res = await fetch('/api/wimpy/message', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Wimpy request failed');
        const j = await res.json();
        if (j.conversationId) window.currentWimpyConvoId = j.conversationId;
        if (j.reply) {
          appendWimpyMessage('Wimpy', j.reply.text || (j.reply.message || ''), 'other', j.reply.id || null);
        } else if (j.message && j.message.text) {
          appendWimpyMessage('Wimpy', j.message.text, 'other', j.message.id || null);
        }
        setTimeout(loadWimpyConversations, 200);
      } catch (err) {
        console.error('sendWimpyMessage error', err);
        // try to surface server response body if available
        try {
          if (err && err.message && err.message.indexOf('Wimpy request failed') !== -1) {
            const resText = await (await fetch('/api/wimpy/message', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ conversationId: convoId, text }) })).text().catch(()=>null);
            alert('Failed to send message to Wimpy: ' + (resText || err.message));
          } else {
            alert('Failed to send message to Wimpy: ' + (err.message || String(err)));
          }
        } catch (e) {
          alert('Failed to send message to Wimpy');
        }
      } finally {
        if (wimpyInput) wimpyInput.disabled = false; wimpyInput && wimpyInput.focus();
      }
    });
  }

  // Wimpy attach button wiring (elements declared earlier)
  if (wimpyAttachBtn && wimpyMediaInput) {
    wimpyAttachBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try { wimpyMediaInput.click(); } catch (e) {}
    });
    // optionally show a tiny preview when file selected
    wimpyMediaInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      // show a brief preview in messages log (optimistic)
      const reader = new FileReader();
      reader.onload = (ev) => {
        appendWimpyMessage(currentUser?.username || 'You', '[attached media]', 'own');
      };
      reader.readAsDataURL(f);
    });
  }

  // ===== FRIEND REQUESTS =====
  const friendRequestsModal = document.getElementById('friendRequestsModal');
  const pendingRequestsModalList = document.getElementById('pendingRequestsModalList');
  const noPendingRequests = document.getElementById('noPendingRequests');

  async function loadFriendRequests() {
    try {
      const res = await fetch(`${API_PREFIX}/friends/requests/pending`, {
        headers: { 'authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) return;
      const requests = await res.json();
      
      pendingRequestsModalList.innerHTML = '';
      if (requests.length === 0) {
        noPendingRequests.style.display = 'block';
        return;
      }
      
      noPendingRequests.style.display = 'none';
      requests.forEach(req => {
        const card = document.createElement('div');
        card.className = 'friend-request-card';
        card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;background:rgba(212,175,55,0.1);border-radius:8px;margin-bottom:10px;border-left:3px solid var(--gold);';
        card.innerHTML = `
          <img src="${req.fromAvatar}" alt="" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">
          <div style="flex:1;">
            <div style="color:var(--gold);font-weight:bold;">${req.fromUsername}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${new Date(req.createdAt).toLocaleDateString()}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="acceptFriendRequest('${req.fromUserId}')" style="padding:6px 12px;background:var(--gold);border:none;border-radius:6px;color:#000;cursor:pointer;font-weight:bold;">Accept</button>
            <button onclick="declineFriendRequest('${req.fromUserId}')" style="padding:6px 12px;background:rgba(212,175,55,0.2);border:2px solid var(--gold);border-radius:6px;color:var(--gold);cursor:pointer;font-weight:bold;">Decline</button>
          </div>
        `;
        pendingRequestsModalList.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading friend requests:', err);
    }
  }

  window.acceptFriendRequest = async function(fromUserId) {
    try {
      const res = await fetch(`${API_PREFIX}/friends/requests/accept`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ fromUserId })
      });

      if (!res.ok) throw new Error('Failed to accept request');

      await loadFriendRequests();
      await loadFriends();
      alert('✨ Friend added!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.declineFriendRequest = async function(fromUserId) {
    try {
      const res = await fetch(`${API_PREFIX}/friends/requests/decline`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ fromUserId })
      });

      if (!res.ok) throw new Error('Failed to decline request');

      await loadFriendRequests();
      alert('Request declined');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Add button to show friend requests
  const friendRequestsBtn = document.createElement('button');
  friendRequestsBtn.id = 'friendRequestsBtn';
  friendRequestsBtn.className = 'nav-btn';
  friendRequestsBtn.title = 'Friend Requests';
  friendRequestsBtn.style.cssText = 'width:40px;height:40px;border:2px solid transparent;border-radius:10px;background:rgba(212,175,55,0.1);color:var(--text-primary);font-size:20px;cursor:pointer;transition:all 0.3s ease;';
  friendRequestsBtn.innerHTML = '📬';
  friendRequestsBtn.addEventListener('click', () => {
    friendRequestsModal.style.display = 'flex';
    loadFriendRequests();
  });

  // Add close handler for friend requests modal
  const friendRequestsCloseBtn = friendRequestsModal?.querySelector('.close-modal-btn');
  if (friendRequestsCloseBtn) {
    friendRequestsCloseBtn.addEventListener('click', () => {
      friendRequestsModal.style.display = 'none';
    });
  }

  // Append to nav actions if they exist
  const navActions = document.querySelector('.nav-actions');
  if (navActions && friendRequestsBtn.parentNode !== navActions) {
    // insert before settings btn
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.parentNode.insertBefore(friendRequestsBtn, settingsBtn);
    } else {
      navActions.appendChild(friendRequestsBtn);
    }
  }

  // Emoji / Stickers / Voice handlers
  const voiceBtnEl = document.getElementById('voiceBtn');

  const recordingIndicator = document.getElementById('recordingIndicator');
  const recordingTimeEl = document.getElementById('recordingTime');

  // Hold-to-record implementation (mouse + touch)
  if (voiceBtnEl) {
    let holdStream = null;
    let holdRec = null;
    let holdChunks = [];
    let holdStartTime = 0;
    let holdTimer = null;
    let rafId = null;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let isCancelled = false;

    const waves = recordingIndicator ? Array.from(recordingIndicator.querySelectorAll('.wave')) : [];

    function updateWaveform() {
      if (!analyser) return;
      analyser.getByteTimeDomainData(dataArray);
      // compute simple level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(1, rms * 6);
      waves.forEach((w, i) => {
        const scale = 0.4 + level * (0.6 + i * 0.15);
        w.style.transform = `scaleY(${scale})`;
      });
      rafId = requestAnimationFrame(updateWaveform);
    }

    async function startHoldRecording() {
      if (!window.currentOtherId) return alert('Open a chat first');
      try {
        isCancelled = false;
        holdStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(holdStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.fftSize);
        src.connect(analyser);

        holdChunks = [];
        holdRec = new MediaRecorder(holdStream, { mimeType: 'audio/webm' });
        holdRec.ondataavailable = e => holdChunks.push(e.data);

        // Process on stop to ensure final chunk is included
        holdRec.onstop = async () => {
          try {
            if (isCancelled) {
              holdChunks = [];
              return;
            }

            const blob = new Blob(holdChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = async () => {
              const dataUrl = reader.result;
              const up = await uploadMediaToCDN(dataUrl, 'voice.webm');
              const url = up.url || dataUrl;
              const msgEl = appendMessage(currentUser.username, { type: 'audio', content: url }, 'own', '', 'sending');
              try {
                const res = await fetch(`${API_PREFIX}/messages`, {
                  method: 'POST',
                  headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
                  body: JSON.stringify({ toId: window.currentOtherId, type: 'audio', content: url })
                });
                if (!res.ok) throw new Error('Failed to send');
                const resJson = await res.json().catch(()=>({}));
                const serverMessageId = resJson.id || resJson.messageId || (resJson.message && resJson.message.id) || null;
                if (serverMessageId) try { msgEl.dataset.messageId = serverMessageId; } catch(e){}
                updateMessageStatus(msgEl, 'sent');
                if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'message', toId: window.currentOtherId, message: { type: 'audio', content: url }, messageId: msgEl.dataset.messageId }));
              } catch (err) { console.warn('Failed to send voice message', err); updateMessageStatus(msgEl, 'failed'); }
            };
            reader.readAsDataURL(blob);
          } finally {
            holdChunks = [];
          }
        };

        holdRec.start();

        if (recordingIndicator) {
          recordingIndicator.classList.remove('hidden');
          recordingTimeEl.textContent = '0:00';
        }
        holdStartTime = Date.now();
        holdTimer = setInterval(() => {
          const s = Math.floor((Date.now() - holdStartTime) / 1000);
          recordingTimeEl.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
        }, 500);

        updateWaveform();
      } catch (err) {
        console.error('Microphone access denied', err);
        alert('Microphone access denied');
      }
    }

    function stopHoldRecording(send = true) {
      if (holdRec && holdRec.state !== 'inactive') holdRec.stop();
      if (holdStream) {
        holdStream.getTracks().forEach(t => t.stop());
        holdStream = null;
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
      }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
      if (recordingIndicator) recordingIndicator.classList.add('hidden');

      // mark cancelled if not sending
      if (!send) {
        isCancelled = true;
      }
      // final processing happens in holdRec.onstop
      // cleanup will occur after onstop handler finishes
    }

    // pointer events for unified mouse/touch handling
    let startX = 0;
    let startY = 0;
    const CANCEL_DISTANCE = 80; // pixels to drag to cancel

    voiceBtnEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (typeof emojiPicker !== 'undefined' && emojiPicker) emojiPicker.classList.add('hidden');
      if (typeof stickersPicker !== 'undefined' && stickersPicker) stickersPicker.classList.add('hidden');
      startX = ev.clientX;
      startY = ev.clientY;
      startHoldRecording();
    });

    window.addEventListener('pointerup', (ev) => {
      if (!holdRec) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > CANCEL_DISTANCE) {
        isCancelled = true;
        stopHoldRecording(false);
      } else {
        stopHoldRecording(true);
      }
    });

    window.addEventListener('pointermove', (ev) => {
      if (!holdRec) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // simple visual hint: change indicator opacity when dragging far
      if (recordingIndicator) recordingIndicator.style.opacity = dist > CANCEL_DISTANCE ? '0.4' : '1';
    });
  }

  let voiceStream = null;
  let voiceRec = null;
  let voiceChunks = [];

  if (voiceBtnEl) {
    voiceBtnEl.addEventListener('click', async () => {
      if (!window.currentOtherId) return alert('Open a chat first');
      try {
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceRec = new MediaRecorder(voiceStream, { mimeType: 'audio/webm' });
        voiceChunks = [];
        voiceRec.ondataavailable = e => voiceChunks.push(e.data);
        voiceRec.onstop = async () => {
          const blob = new Blob(voiceChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result;
            // upload
            const up = await uploadMediaToCDN(dataUrl, 'voice.webm');
            const url = up.url || dataUrl;
            const msgEl = appendMessage(currentUser.username, { type: 'audio', content: url }, 'own', '', 'sending');
            try {
              const res = await fetch(`${API_PREFIX}/messages`, {
                method: 'POST',
                headers: { 'authorization': `Bearer ${currentToken}`, 'content-type': 'application/json' },
                body: JSON.stringify({ toId: window.currentOtherId, type: 'audio', content: url })
              });
              if (!res.ok) throw new Error('Failed to send');
              const resJson = await res.json().catch(()=>({}));
              const serverMessageId = resJson.id || resJson.messageId || (resJson.message && resJson.message.id) || null;
              if (serverMessageId) try { msgEl.dataset.messageId = serverMessageId; } catch(e){}
              updateMessageStatus(msgEl, 'sent');
              if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'message', toId: window.currentOtherId, message: { type: 'audio', content: url }, messageId: msgEl.dataset.messageId }));
            } catch (err) { console.warn('Failed to send voice message', err); updateMessageStatus(msgEl, 'failed'); }
            // cleanup stream tracks
            if (voiceStream && voiceStream.getTracks) {
              voiceStream.getTracks().forEach(t => t.stop());
            }
            voiceStream = null;
            voiceRec = null;
            voiceChunks = [];
            if (recordingIndicator) recordingIndicator.classList.add('hidden');
          };
          reader.readAsDataURL(blob);
        };
        voiceRec.start();
      } catch (err) {
        alert('Microphone access denied');
      }
    });
  }

  if (voiceBtnEl) {
    voiceBtnEl.addEventListener('pointerup', () => {
      if (voiceRec && voiceRec.state !== 'inactive') voiceRec.stop();
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Theme preset setter
  function setAppTheme(name) {
    document.body.classList.remove('theme-cyberpunk','theme-naruto','theme-warlord');
    if (name === 'cyberpunk') document.body.classList.add('theme-cyberpunk');
    if (name === 'naruto') document.body.classList.add('theme-naruto');
    if (name === 'warlord') document.body.classList.add('theme-warlord');
    localStorage.setItem('wimpex_theme_choice', name || '');
  }

  // Wire theme buttons if present
  const themeCyberpunkBtn = document.getElementById('themeCyberpunkBtn');
  const themeNarutoBtn = document.getElementById('themeNarutoBtn');
  const themeWarlordBtn = document.getElementById('themeWarlordBtn');
  const themeResetBtn = document.getElementById('themeResetBtn');

  if (themeCyberpunkBtn) themeCyberpunkBtn.addEventListener('click', () => setAppTheme('cyberpunk'));
  if (themeNarutoBtn) themeNarutoBtn.addEventListener('click', () => setAppTheme('naruto'));
  if (themeWarlordBtn) themeWarlordBtn.addEventListener('click', () => setAppTheme('warlord'));
  if (themeResetBtn) themeResetBtn.addEventListener('click', () => setAppTheme(''));

  if (shareProfileBtn) {
    shareProfileBtn.addEventListener('click', () => {
      const url = `${location.origin}/profile.html?u=${currentUserId}`;
      navigator.clipboard?.writeText(url).then(() => alert('Profile link copied to clipboard')).catch(() => prompt('Copy this link', url));
    });
  }

  window.toggleTheme = function() {
    const body = document.body;
    const isDark = body.classList.contains('light-theme');
    if (isDark) {
      body.classList.remove('light-theme');
      localStorage.setItem('wimpex_theme', 'dark');
      if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
    } else {
      body.classList.add('light-theme');
      localStorage.setItem('wimpex_theme', 'light');
      if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    }
  };

  // Chat menu helpers
  window.showCreateGroupModal = function() {
    const groupCreationModal = document.getElementById('groupCreationModal');
    if (groupCreationModal) groupCreationModal.style.display = 'flex';
  };

  window.showSearchUserModal = function() {
    const choice = prompt('Enter username to search:');
    if (!choice) return;
    newChatBtn.click();
  };

  window.clearChatHistory = function() {
    if (confirm('Clear this chat history?')) {
      messagesLog.innerHTML = '';
      alert('Chat history cleared');
    }
  };

  window.muteChat = function() {
    alert('🔇 Chat muted (notifications disabled)');
  };

  // 3-dot menu toggle
  const chatMenuBtn = document.getElementById('chatMenuBtn');
  const chatMenu = document.getElementById('chatMenu');
  if (chatMenuBtn) {
    chatMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chatMenu.style.display === 'none') {
        chatMenu.style.display = 'block';
        chatMenu.classList.remove('hidden');
      } else {
        chatMenu.style.display = 'none';
        chatMenu.classList.add('hidden');
      }
    });
  }

  // Close menu when clicking elsewhere
  document.addEventListener('click', () => {
    if (chatMenu) {
      chatMenu.style.display = 'none';
      chatMenu.classList.add('hidden');
    }
  });

  // Chat menu item event listeners
  const chatMenuItems = document.querySelectorAll('.chat-menu-item');
  chatMenuItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (index === 0) initiateVideoCall();
      else if (index === 1) initiateAudioCall();
      else if (index === 2) showCreateGroupModal();
      else if (index === 3) showSearchUserModal();
      else if (index === 4) toggleTheme();
      else if (index === 5) clearChatHistory();
      else if (index === 6) muteChat();
      // Close menu after action
      setTimeout(() => {
        if (chatMenu) {
          chatMenu.style.display = 'none';
          chatMenu.classList.add('hidden');
        }
      }, 100);
    });
  });

  // ===== INIT =====
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  
  if (loadSession()) {
    onAuthSuccess();
    if (isAdmin) showAdminPanel();
  } else {
    authContainer.style.display = 'flex';
    sidebar.classList.add('hidden');
  }

  // Apply saved preset theme
  const savedPreset = localStorage.getItem('wimpex_theme_choice');
  if (savedPreset) setAppTheme(savedPreset);

  // Apply saved light/dark theme
  const savedMode = localStorage.getItem('wimpex_theme');
  if (savedMode === 'light') {
    document.body.classList.add('light-theme');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
  } else if (savedMode === 'dark') {
    document.body.classList.remove('light-theme');
    if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
  }

  // ===== WebRTC Configuration =====
  let peerConnection = null;
  let remoteStream = null;
  let currentCallId = null;
  let callInProgress = false;

  const ICE_SERVERS = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun2.l.google.com:19302'] }
    ]
  };

  // Create PeerConnection with ICE servers
  function createPeerConnection() {
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
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
      alert('Camera/microphone access denied: ' + err.message);
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
      // award points for starting a call
      fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 5 }) }).catch(()=>{});
      
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
      // award points for starting an audio call
      fetch('/api/scores/add', { method: 'POST', headers: { 'content-type':'application/json','authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ points: 4 }) }).catch(()=>{});
      
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
  }

  // Display remote video
  function displayRemoteVideo(stream) {
    let remoteVideoEl = document.getElementById('remoteVideo');
    if (!remoteVideoEl) {
      remoteVideoEl = document.createElement('video');
      remoteVideoEl.id = 'remoteVideo';
      remoteVideoEl.autoplay = true;
      remoteVideoEl.playsinline = true;
      remoteVideoEl.style.cssText = 'position:fixed;top:0;right:0;width:200px;height:150px;border-radius:12px;border:3px solid #d4af37;margin:12px;z-index:2999;object-fit:cover;';
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
    
    const remoteVideoEl = document.getElementById('remoteVideo');
    if (remoteVideoEl) {
      remoteVideoEl.remove();
    }
  }

  // ===== CALLING FUNCTIONS =====
  const callBtn = document.getElementById('callBtn');
  const audioCallBtn = document.getElementById('audioCallBtn');

  if (callBtn) {
    callBtn.addEventListener('click', () => {
      if (!window.currentOtherId) return alert('Open a chat first');
      initiateVideoCall();
    });

  // People search handlers
  const peopleSearchInput = document.getElementById('peopleSearchInput');
  const peopleSearchBtn = document.getElementById('peopleSearchBtn');
  const recommendationsList = document.getElementById('recommendationsList');
  async function performUserSearch(q) {
    if (!q) {
      recommendationsList.innerHTML = '<div style="padding:12px;color:#999;">Type to search users by username</div>';
      return;
    }
    try {
      const res = await fetch(`${API_PREFIX}/search?q=${encodeURIComponent(q)}`, { headers: { 'authorization': `Bearer ${currentToken}` } });
      const raw = await res.text();
      let data = [];
      try { data = JSON.parse(raw || '[]'); } catch (e) { try { data = JSON.parse(raw.replace(/[\u0000-\u001F]+/g,'')); } catch (e2) { data = []; } }
      recommendationsList.innerHTML = '';
      if (!data || data.length === 0) {
        recommendationsList.innerHTML = '<div style="padding:12px;color:#999;">No users found</div>';
        return;
      }
      data.forEach(u => {
        const item = document.createElement('div'); item.className = 'recommendation-item';
        item.style.display = 'flex'; item.style.alignItems='center'; item.style.justifyContent='space-between'; item.style.padding='8px';
        item.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div style="width:44px;height:44px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,0.02);display:flex;align-items:center;justify-content:center">${u.avatar?`<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover">`:`${(u.username||'U').charAt(0).toUpperCase()}`}</div><div><div style="font-weight:700">${escapeHtml(u.username||u.name||'Unknown')}</div><div style="font-size:12px;color:#999">${escapeHtml(u.bio||'')}</div></div></div>`;
        const addBtn = document.createElement('button'); addBtn.className='gold-btn'; addBtn.textContent='Add'; addBtn.addEventListener('click', async ()=>{
          try {
            const r = await fetch(`${API_PREFIX}/friends/add`, { method:'POST', headers: {'content-type':'application/json','authorization':`Bearer ${currentToken}`}, body: JSON.stringify({ userId: u.userId || u.id || u.user_id }) });
            if (!r.ok) throw new Error('Failed');
            addBtn.textContent = 'Added'; addBtn.disabled = true;
          } catch (err) { alert('Failed to add friend'); }
        });
        item.appendChild(addBtn);
        recommendationsList.appendChild(item);
      });
    } catch (err) {
      console.error('Search failed', err);
      recommendationsList.innerHTML = '<div style="padding:12px;color:#999;">Search error</div>';
    }
  }
  if (peopleSearchBtn && peopleSearchInput) {
    peopleSearchBtn.addEventListener('click', ()=> performUserSearch(peopleSearchInput.value.trim()));
    peopleSearchInput.addEventListener('input', (e)=> performUserSearch(e.target.value.trim()));
  }
  }

  if (audioCallBtn) {
    audioCallBtn.addEventListener('click', () => {
      if (!window.currentOtherId) return alert('Open a chat first');
      initiateAudioCall();
    });
  }

  console.log('🌟 Wimpex loaded with WebRTC calling');
})();
