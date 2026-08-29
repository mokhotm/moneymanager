const http = require('http');

async function testRenderedDocs() {
  console.log("=== TESTING RENDERED DOCUMENTS HTML ON 13.60.187.56 ===");

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

  console.log("-> Authenticated as mokhotm!");

  const html = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.60.187.56',
      port: 80,
      path: '/documents',
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`\n/documents page returned ${html.length} bytes`);
}

testRenderedDocs().catch(console.error);
