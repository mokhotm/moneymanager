const http = require('http');

async function testLiveBanking() {
  console.log("=== TESTING LIVE BANKING API ON EC2 (http://13.61.15.20) ===");

  // 1. Authenticate as mokhotm
  const loginPayload = JSON.stringify({
    username: "mokhotm",
    password: "Engim002@85590"
  });

  const cookie = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.61.15.20',
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
          const sessionCookie = rawCookies.map(c => c.split(';')[0]).join('; ');
          resolve(sessionCookie);
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
    console.error("Authentication failed: No session cookie received");
    return;
  }

  console.log("-> Authenticated as mokhotm successfully!");

  // 2. Query GET /api/banking
  const bankingData = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.61.15.20',
      port: 80,
      path: '/api/banking',
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log("\n=== /api/banking RESPONSE ===");
  console.log(`- Total Connections: ${bankingData.connections?.length || 0}`);
  console.log(`- Unlinked Accounts: ${bankingData.unlinkedAccounts?.length || 0}`);
  console.log(`- Available SA Connectors: ${bankingData.availableConnectors?.length || 0}`);
  console.log(`- Sandbox Mode: ${bankingData.isSandboxMode}`);

  if (bankingData.availableConnectors) {
    console.log("\nAvailable SA Bank Connectors:");
    for (const c of bankingData.availableConnectors) {
      console.log(`  * [${c.id}] ${c.displayName} (${c.status})`);
    }
  }

  // 3. Link Standard Bank Prestige account if unlinked
  if (bankingData.unlinkedAccounts && bankingData.unlinkedAccounts.length > 0) {
    const target = bankingData.unlinkedAccounts[0];
    console.log(`\nLinking ${target.name} via /api/banking...`);
    const linkPayload = JSON.stringify({
      accountId: target.id,
      institution: target.institution || "Standard Bank",
      syncFrequency: "DAILY"
    });

    const linkRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '13.61.15.20',
        port: 80,
        path: '/api/banking',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(linkPayload),
          'Cookie': cookie
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(linkPayload);
      req.end();
    });

    console.log("-> Link result:", linkRes);

    // 4. Trigger Sync
    console.log("\nTriggering on-demand sync via /api/banking/sync...");
    const syncRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '13.61.15.20',
        port: 80,
        path: '/api/banking/sync',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ syncAll: true }));
      req.end();
    });

    console.log("-> Sync result:", syncRes);
  }
}

testLiveBanking().catch(console.error);
