const http = require('http');

async function testDocsEndpoint() {
  console.log("=== TESTING GET /api/documents AS mokhotm ON EC2 ===");

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

  const docs = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.61.15.20',
      port: 80,
      path: '/api/documents',
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`\nTotal Documents returned by GET /api/documents: ${docs.length}`);
  for (const d of docs) {
    console.log(`- [${d.documentType}] ${d.documentName} | Inst: ${d.institution} | Acc: ${d.accountName} | Date: ${d.periodStart || d.uploadedAt}`);
  }
}

testDocsEndpoint().catch(console.error);
