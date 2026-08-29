async function test() {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'mokhotm',
        password: 'Engim002@85590'
      })
    });
    console.log('STATUS:', res.status, res.statusText);
    console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('BODY:', text);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test();
