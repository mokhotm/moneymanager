async function verifySession() {
  const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'mokhotm',
      password: 'Engim002@85590'
    })
  });

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login Status:', loginRes.status);
  console.log('Set-Cookie received:', cookie);

  const meRes = await fetch('http://127.0.0.1:3001/api/auth/me', {
    headers: { 'Cookie': cookie }
  });
  console.log('Me API Status:', meRes.status);
  const meData = await meRes.json();
  console.log('Me API Response:', meData);

  const dashboardRes = await fetch('http://127.0.0.1:3001/api/dashboard', {
    headers: { 'Cookie': cookie }
  });
  console.log('Dashboard API Status:', dashboardRes.status);
  const dashData = await dashboardRes.json();
  console.log('Dashboard Accounts Count:', dashData.accounts?.length);
  console.log('Dashboard Net Worth:', dashData.netWorth);
}

verifySession().catch(console.error);
