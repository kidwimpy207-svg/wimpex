(async ()=>{
  try {
    const res = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'apitest', email: 'apitest@example.com', password: 'TestPass123!', gender: 'other' })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (e) {
    console.error('ERR', e);
  }
})();
