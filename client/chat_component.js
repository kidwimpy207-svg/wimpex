// Chat component integration: enhances the existing chatDetail view (auto-resize, auto-scroll helpers, media pickers)
(function(){
  const messagesLog = document.getElementById('messagesLog');
  const messageInput = document.getElementById('messageInput');
  const messageForm = document.getElementById('messageForm');
  const chatDetail = document.getElementById('chatDetail');
  const chatFooter = document.querySelector('#chatDetail .message-input') || document.querySelector('#chatDetail .chat-footer');
  const chatHeader = document.querySelector('#chatDetail .chat-header');
  const newMsgIndicator = document.getElementById('newMessageIndicator');
  const newMsgCount = document.getElementById('newMessageCount');
  const pinScrollBtn = document.getElementById('pinScrollBtn');
  const chatMediaInput = document.getElementById('chatMediaInput');

  if(!messagesLog || !messageInput) return; // nothing to enhance

  // Ensure the messages area stays strictly between header and footer: use flexbox on chatDetail (CSS should handle it), but also set min-height fallback
  function ensureLayoutConstraints(){
    try{
      const headerH = chatHeader ? Math.round(chatHeader.getBoundingClientRect().height) : 72;
      const footerH = chatFooter ? Math.round(chatFooter.getBoundingClientRect().height) : 72;
      // Force an explicit height for the scrollable messages area so it never overlaps header/footer
      // Subtract a small margin to account for paddings
      const calcH = `calc(100vh - ${headerH}px - ${footerH}px - 8px)`;
      messagesLog.style.height = calcH;
      messagesLog.style.maxHeight = calcH;
      // Ensure scrolling is enabled and not blocked by parent styles or overlays
      messagesLog.style.overflowY = 'auto';
      messagesLog.style.overflowX = 'hidden';
      messagesLog.style.position = messagesLog.style.position || 'relative';
      messagesLog.style.zIndex = messagesLog.style.zIndex || '2';
      messagesLog.style.pointerEvents = 'auto';
      messagesLog.style.touchAction = 'pan-y';
      try { messagesLog.tabIndex = -1; } catch (e) {}
    }catch(e){ console.warn('ensureLayoutConstraints failed', e); }
  }
  ensureLayoutConstraints();
  window.addEventListener('resize', ensureLayoutConstraints);

  // Prevent parent containers from intercepting wheel/touch so internal scroll works
  try {
    messagesLog.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
    messagesLog.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
    messagesLog.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });
  } catch (e) {
    // older browsers may not support passive option
    try { messagesLog.addEventListener('wheel', (e) => e.stopPropagation()); } catch (e2) {}
  }

  // Smooth scroll helper
  function scrollToBottomIfNear(threshold = 120){
    const atBottom = (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < threshold;
    if(atBottom) messagesLog.scrollTop = messagesLog.scrollHeight;
  }

  // Auto-resize textarea
  function autoResize(){
    messageInput.style.height = 'auto';
    const newH = Math.min(messageInput.scrollHeight, 120);
    messageInput.style.height = newH + 'px';
  }
  messageInput.addEventListener('input', autoResize);
  autoResize();

  // New message indicator behavior
  let unseen = 0;
  messagesLog.addEventListener('scroll', ()=>{
    const near = (messagesLog.scrollHeight - messagesLog.scrollTop - messagesLog.clientHeight) < 120;
    if(near){ unseen = 0; if(newMsgIndicator){ newMsgIndicator.classList.add('hidden'); newMsgIndicator.classList.remove('pulse'); newMsgIndicator.setAttribute('aria-hidden','true'); } if(newMsgCount) newMsgCount.textContent = '0'; }
  });
  if(newMsgIndicator) newMsgIndicator.addEventListener('click', ()=>{ messagesLog.scrollTop = messagesLog.scrollHeight; if(newMsgIndicator){ newMsgIndicator.classList.add('hidden'); newMsgIndicator.classList.remove('pulse'); } unseen = 0; if(newMsgCount) newMsgCount.textContent='0'; });

  // Wire media picker button (camera icon in message form) to the file input if present
  const msgCameraBtn = document.getElementById('msgCameraBtn');
  if(msgCameraBtn && chatMediaInput){ msgCameraBtn.addEventListener('click', (e)=>{ e.preventDefault(); chatMediaInput.click(); }); }

  // Improve chatMediaInput change: show a quick preview bubble using existing appendMessage if available
  if(chatMediaInput){
    chatMediaInput.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{
        // attempt to call global appendMessage (from app.js) which returns an element
        if(typeof window.appendMessage === 'function'){
          // image
          if(f.type.startsWith('image/')){
            window.appendMessage ? window.appendMessage('Me', { type:'image', content: ev.target.result }, 'own') : null;
          } else if(f.type.startsWith('video/')){
            window.appendMessage ? window.appendMessage('Me', { type:'text', content: '[Video]' }, 'own') : null;
          } else {
            window.appendMessage ? window.appendMessage('Me', { type:'file', content: '' }, 'own') : null;
          }
        } else {
          // fallback: create a simple bubble
          const el = document.createElement('div'); el.className = 'message own gradient';
          if(f.type.startsWith('image/')){ const img = document.createElement('img'); img.src = ev.target.result; img.style.maxWidth='320px'; img.style.borderRadius='10px'; el.appendChild(img); } else { const a = document.createElement('a'); a.href = ev.target.result; a.innerText = f.name || 'Attachment'; el.appendChild(a); }
          messagesLog.appendChild(el); messagesLog.scrollTop = messagesLog.scrollHeight;
        }
      };
      reader.readAsDataURL(f);
      // clear
      e.target.value = '';
    });
  }

  // Hook into messageForm submit: send messages via queued WS or REST fallback and auto-scroll
  if(messageForm){
    messageForm.addEventListener('submit', async (ev) =>{
      try {
        ev.preventDefault();
        const text = (messageInput.value || '').trim();
        if (!text) return;
        const clientId = (typeof window.generateMessageId === 'function') ? window.generateMessageId() : ('m_' + Date.now());
        const replyMeta = window.replyTo ? { replyTo: window.replyTo.id } : {};

        // optimistic UI
        if (typeof window.appendMessage === 'function') {
          try { window.appendMessage('Me', text, 'own', '', 'sending', clientId); } catch (e) { console.warn('appendMessage optimistic failed', e); }
        }

        const payload = { toId: window.currentOtherId, type: 'text', text, clientId, ...replyMeta };

        if (window.sendWS) {
          window.sendWS({ type: 'message', ...payload });
        } else {
          try {
            await fetch('/api/messages', { method: 'POST', headers: { 'content-type':'application/json', 'authorization': `Bearer ${window.currentToken}` }, body: JSON.stringify(payload) });
          } catch (e) { console.warn('messages POST failed', e); }
        }

        // clear input and reply state
        messageInput.value = '';
        messageInput.style.height = 'auto';
        if (window.replyTo) { window.replyTo = null; messageInput.placeholder = 'Type a message...'; }
        setTimeout(()=> scrollToBottomIfNear(120), 60);
      } catch (e) { console.warn('message send handler failed', e); }
    });
  }

  // Expose small helper for other scripts
  window.chatComponent = {
    ensureLayout: ensureLayoutConstraints,
    scrollToBottom: ()=>{ messagesLog.scrollTop = messagesLog.scrollHeight; }
  };

  // DOM probe helper for debugging in console
  window.chatProbe = function() {
    try {
      const msgs = Array.from(messagesLog.querySelectorAll('.message'));
      console.group('Chat Probe');
      console.log('messagesCount:', msgs.length);
      if (msgs.length > 0) {
        console.log('first id:', msgs[0].dataset.messageId, 'last id:', msgs[msgs.length-1].dataset.messageId);
      }
      console.log('messagesLog rect:', messagesLog.getBoundingClientRect());
      console.log('header rect:', chatHeader ? chatHeader.getBoundingClientRect() : null);
      console.log('footer rect:', chatFooter ? chatFooter.getBoundingClientRect() : null);
      console.log('messageInput present:', !!document.getElementById('messageInput'));
      console.groupEnd();
    } catch (e) { console.warn('chatProbe failed', e); }
  };

})();
