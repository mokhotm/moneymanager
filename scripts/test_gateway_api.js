async function testGatewayConfig() {
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

  // Test GET gateways
  const getRes = await fetch('http://127.0.0.1:3001/api/billing/admin/gateways', {
    headers: { 'Cookie': cookie }
  });
  const getData = await getRes.json();
  console.log('Gateways GET Status:', getRes.status, 'Configs count:', getData.configs?.length);

  // Test POST gateway config with PayFast and FNB settlement
  const postRes = await fetch('http://127.0.0.1:3001/api/billing/admin/gateways', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      provider: 'PAYFAST',
      mode: 'SANDBOX',
      merchantCredentials: {
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: 'demo_passphrase_2026',
        webhookSecret: 'whsec_demo_2026'
      },
      settlementAccount: {
        institution: 'First National Bank (FNB)',
        accountHolderName: 'Mokhotla Technologies (Pty) Ltd',
        accountNumber: '62839201928',
        accountType: 'Business Cheque Account',
        branchCode: '250655',
        isPrimary: true
      }
    })
  });

  const postData = await postRes.json();
  console.log('Gateway POST Status:', postRes.status, 'Result:', postData.success ? 'SUCCESS' : postData.error);
}

testGatewayConfig().catch(console.error);
