const http = require('http');

async function testUnauthEntities() {
  console.log("=== TESTING /api/entities WHEN UNAUTHENTICATED ===");
  const res = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '13.61.15.20',
      port: 80,
      path: '/api/entities',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log("HTTP Status:", res.status);
  console.log("Response Body:", res.body);
  console.log("Test Passed (No 401 error):", res.status === 200);
}

testUnauthEntities().catch(console.error);
