const http = require('http');

async function testLiveBanking() {
  console.log("=== TESTING LIVE BANKING ON 13.60.187.56 ===");

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

  console.log("-> Authenticated as mokhotm successfully!");

  const bankingData = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.60.187.56',
      port: 80,
      path: '/api/banking',
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

  console.log("\n=== /api/banking RESPONSE ===");
  console.log("- Total Connections:", bankingData.connections?.length ?? 0);
  console.log("- Available SA Connectors:", bankingData.availableConnectors?.length ?? 0);
  console.log("- Sandbox Mode:", bankingData.isSandboxMode);
}

testLiveBanking().catch(console.error);
