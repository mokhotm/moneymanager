const http = require('http');

async function testNewIp() {
  console.log("=== TESTING LIVE MONEYMANAGER ON NEW IP (http://13.60.187.56) ===");

  const loginPayload = JSON.stringify({
    username: "mokhotm",
    password: "Engim002@85590"
  });

  const cookie = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.60.187.56',
      port: 80,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const rawCookies = res.headers['set-cookie'];
        if (rawCookies && rawCookies.length > 0) {
          resolve(rawCookies.map(c => c.split(';')[0]).join('; '));
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.write(loginPayload);
    req.end();
  });

  if (!cookie) {
    console.error("Login failed - no cookies returned");
    return;
  }
  console.log("-> Authenticated as mokhotm successfully!");

  const docs = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.60.187.56',
      port: 80,
      path: '/api/documents',
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: "Invalid JSON", raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`\n=== /api/documents RESPONSE ===`);
  if (Array.isArray(docs)) {
    console.log(`Total Documents Ingested & Returned: ${docs.length}`);
    for (const d of docs.slice(0, 8)) {
      console.log(`- [${d.documentType}] ${d.documentName} | Acc: ${d.accountName} | Date: ${d.periodStart || d.uploadedAt}`);
    }
  } else {
    console.log("Response:", docs);
  }
}

testNewIp().catch(console.error);
