(async ()=>{
  const fs = require('fs');
  const path = require('path');
  const signupPayload = JSON.parse(fs.readFileSync(path.join(__dirname,'signup.json'),'utf8'));
  const BASE = 'http://127.0.0.1:3000';
  async function req(method, endpoint, body=null, token=null){
    const headers = { 'content-type':'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try{
      const r = await fetch(BASE+endpoint, opts);
      const text = await r.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch(e){}
      return { status: r.status, body: parsed };
    }catch(e){ return { error: String(e) }; }
  }

  console.log('1) Signup -> get token');
  let res = await req('POST','/api/auth/signup', signupPayload);
  console.log(res);
  if (!res.body || !res.body.token) {
    console.error('Signup failed or no token returned — aborting smoke test');
    process.exit(res.status || 1);
  }
  const token = res.body.token;

  console.log('\n2) GET /api/settings');
  console.log(await req('GET','/api/settings', null, token));

  console.log('\n3) GET /api/stories');
  console.log(await req('GET','/api/stories', null, token));

  console.log('\n4) GET /api/recommendations');
  console.log(await req('GET','/api/recommendations', null, token));

  console.log('\n5) POST /api/onboarding/complete');
  console.log(await req('POST','/api/onboarding/complete', {}, token));

  process.exit(0);
})();
