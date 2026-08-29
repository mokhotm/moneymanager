async function verifyAllApis() {
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

  // Test Money Flow API (default cycle)
  const t0 = Date.now();
  const flowRes = await fetch('http://127.0.0.1:3001/api/money-flow', {
    headers: { 'Cookie': cookie }
  });
  const flowTime = Date.now() - t0;
  const flowData = await flowRes.json();
  console.log(`Money Flow API Status: ${flowRes.status} in ${flowTime}ms`);
  console.log(`Money Flow Items count: ${flowData.flows?.length}`);
  console.log(`Money Flow Summary:`, flowData.summary);

  // Test Reports API
  const r0 = Date.now();
  const reportRes = await fetch('http://127.0.0.1:3001/api/reports?month=2026-08', {
    headers: { 'Cookie': cookie }
  });
  const reportTime = Date.now() - r0;
  const reportData = await reportRes.json();
  console.log(`Reports API Status: ${reportRes.status} in ${reportTime}ms`);
  console.log(`Take-home salary:`, reportData.verifiedTakeHomePay);

  // Test Transactions API
  const txRes = await fetch('http://127.0.0.1:3001/api/transactions?payPeriod=2026-08', {
    headers: { 'Cookie': cookie }
  });
  console.log(`Transactions API Status: ${txRes.status}`);
}

verifyAllApis().catch(console.error);
