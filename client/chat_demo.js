(function(){
  const messagesEl = document.getElementById('messages');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const photoBtn = document.getElementById('photoBtn');
  const attachBtn = document.getElementById('attachBtn');
  const videoBtn = document.getElementById('videoBtn');
  const photoInput = document.getElementById('photoInput');
  const fileInput = document.getElementById('fileInput');
  const videoInput = document.getElementById('videoInput');
  const aiBtn = document.getElementById('aiBtn');
  const messagesWrap = document.querySelector('.messages');

  // Utility: create message bubble and append
  function appendMessage({sender='you', text='', side='other', type='text', meta=''}){
    const el = document.createElement('div');
    el.className = `message ${side}` + (side === 'own' ? ' gradient' : '');

    if(type === 'text'){
      const span = document.createElement('span');
      span.textContent = text;
      el.appendChild(span);
    } else if(type === 'audio'){
      const audioWrap = document.createElement('div');
      audioWrap.className = 'audio-player';
      const play = document.createElement('button');
      play.className = 'audio-play';
      play.innerText = '▶';
      const time = document.createElement('div');
      time.className = 'audio-time';
      time.innerText = '0:00 / 0:01';
      const vol = document.createElement('div');
      vol.className = 'audio-volume';
      vol.innerText = '🔈';
      audioWrap.appendChild(play); audioWrap.appendChild(time); audioWrap.appendChild(vol);
      el.appendChild(audioWrap);

      play.addEventListener('click', ()=>{
        // simple toggle animation demo
        if(play.innerText === '▶') play.innerText = '▮▮'; else play.innerText = '▶';
      });
    } else if(type === 'image'){
      const img = document.createElement('img');
      img.src = text; // text used as url here
      img.style.maxWidth = '320px'; img.style.borderRadius = '10px';
      el.appendChild(img);
    } else if(type === 'file'){
      const a = document.createElement('a'); a.href = '#'; a.innerText = 'Download Document'; a.style.color = 'var(--muted)';
      el.appendChild(a);
    }

    // meta area
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = '';
    el.appendChild(meta);

    // checkmark for outgoing
    if(side === 'own'){
      const ck = document.createElement('div');
      ck.className = 'checkmark';
      ck.textContent = '✓';
      el.appendChild(ck);
      // simulate delivery after a short delay
      setTimeout(()=>{ ck.textContent = '✓✓'; }, 700);
    }

    messagesEl.appendChild(el);
    // auto-scroll if user near bottom
    requestAnimationFrame(()=>{
      if(isUserNearBottom()) messagesWrap.scrollTop = messagesWrap.scrollHeight;
    });
    return el;
  }

  function isUserNearBottom(){
    const threshold = 120; // px
    return (messagesWrap.scrollHeight - messagesWrap.scrollTop - messagesWrap.clientHeight) < threshold;
  }

  // sample initial messages
  appendMessage({text:'hyd', side:'other'});
  appendMessage({text:'hello — this message shows how a longer bubble wraps to multiple lines so you can see layout behaviour on narrow screens', side:'other'});
  appendMessage({type:'audio', side:'other'});
  appendMessage({text:'hey — reply from you', side:'own'});

  // Send behavior
  function sendText(){
    const t = input.value.trim();
    if(!t) return;
    input.value = '';
    const el = appendMessage({text:t, side:'own'});
    // simulate server ack: set single check then double
    const ck = el.querySelector('.checkmark');
    if(ck){ ck.textContent = '✓'; }
    setTimeout(()=>{ if(ck) ck.textContent = '✓✓'; }, 500);
  }

  sendBtn.addEventListener('click', sendText);
  input.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendText(); } });

  // media picker wiring
  photoBtn.addEventListener('click', ()=> photoInput.click());
  attachBtn.addEventListener('click', ()=> fileInput.click());
  videoBtn.addEventListener('click', ()=> videoInput.click());

  photoInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    appendMessage({type:'image', text:url, side:'own'});
  });

  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    appendMessage({type:'file', side:'own'});
  });

  videoInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    const el = appendMessage({type:'text', text:'[Video sent]', side:'own'});
    // optionally show a thumbnail or video element in real app
  });

  // AI generate button (opens a prompt, calls server endpoint, inserts returned image)
  if (aiBtn){
    aiBtn.addEventListener('click', async ()=>{
      const p = window.prompt('Describe the image to generate:');
      if (!p) return;
      // show a temporary outgoing bubble
      const temp = appendMessage({type:'text', text:'Generating image…', side:'own'});
      try {
        const res = await fetch('/api/images/generate-public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: p, size: 512 })
        });
        const j = await res.json().catch(()=>null);
        if (!res.ok) {
          // replace temp with error
          temp.querySelector('span').textContent = 'Image generation failed';
          console.warn('AI generate failed', j);
          return;
        }
        if (j && j.url) {
          // replace temp text bubble with image
          const img = document.createElement('img'); img.src = j.url; img.style.maxWidth='320px'; img.style.borderRadius='10px';
          temp.innerHTML = '';
          temp.appendChild(img);
        } else {
          temp.querySelector('span').textContent = 'No image returned';
        }
      } catch (err) {
        temp.querySelector('span').textContent = 'Generation error';
        console.error('AI generate error', err);
      }
    });
  }

  // Keep footer visible when focusing textarea on mobile
  input.addEventListener('focus', ()=>{
    // scroll to bottom to keep input visible
    setTimeout(()=> messagesWrap.scrollTop = messagesWrap.scrollHeight, 200);
  });

  // Ensure the messages area never overlaps header/footer by calculating space (flexbox handles it)
  // But also ensure on resize we keep scrolled to bottom if needed
  window.addEventListener('resize', ()=>{ if(isUserNearBottom()) messagesWrap.scrollTop = messagesWrap.scrollHeight; });

})();