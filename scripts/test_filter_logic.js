const http = require('http');

function resolveSalaryCycleRange(monthKey) {
  return {
    startDate: '2026-08-14T00:00:00.000Z',
    endDate: '2026-09-14T23:59:59.999Z'
  };
}

async function testFilterLogic() {
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
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });

  console.log(`Total Docs fetched from /api/documents: ${docs.length}`);
  
  const cycle = resolveSalaryCycleRange('2026-08');
  const start = new Date(cycle.startDate).getTime();
  const end = new Date(cycle.endDate).getTime();

  let matchedAugust = 0;
  for (const doc of docs) {
    const fallbackDate = new Date(doc.uploadedAt).getTime();
    const docStart = doc.periodStart ? new Date(doc.periodStart).getTime() : (doc.periodEnd ? new Date(doc.periodEnd).getTime() : fallbackDate);
    const docEnd = doc.periodEnd ? new Date(doc.periodEnd).getTime() : (doc.periodStart ? new Date(doc.periodStart).getTime() : fallbackDate);
    const matches = docStart <= end && docEnd >= start;
    if (matches) matchedAugust++;
    console.log(`- [${doc.documentType}] ${doc.documentName}`);
    console.log(`  periodStart: ${doc.periodStart} | periodEnd: ${doc.periodEnd} | uploadedAt: ${doc.uploadedAt}`);
    console.log(`  Matches August (14 Aug - 14 Sep): ${matches}`);
  }
  console.log(`\nMatched August: ${matchedAugust} / ${docs.length}`);
}

testFilterLogic().catch(console.error);
