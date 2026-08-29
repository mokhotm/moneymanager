const http = require('http');

async function testAllJurisdictions() {
  const loginData = JSON.stringify({ username: 'mokhotm', password: 'Engim002@85590' });
  
  const req = http.request('http://13.61.15.20/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, (res) => {
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    const jurisdictions = ['ZA', 'US', 'UK', 'CA', 'AU', 'EU', 'GLOBAL'];
    
    console.log('Successfully authenticated with EC2 instance! Testing all 7 jurisdictions:');
    
    jurisdictions.forEach(j => {
      const getReq = http.get('http://13.61.15.20/api/tax?jurisdiction=' + j, {
        headers: { 'Cookie': cookie }
      }, (taxRes) => {
        let data = '';
        taxRes.on('data', chunk => data += chunk);
        taxRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            const info = json.jurisdictionInfo;
            const res = json.result;
            console.log(`[${info.flag} ${info.code}] ${info.name} (${info.authority}) -> Gross: ${info.currencySymbol}${res.grossAnnualIncome.toLocaleString()} | Pre-Tax: ${info.currencySymbol}${res.estimatedTaxWithoutOptimizations.toLocaleString()} | Opt-Tax: ${info.currencySymbol}${res.estimatedTaxWithOptimizations.toLocaleString()} | Savings: ${info.currencySymbol}${res.potentialAnnualTaxSavings.toLocaleString()} | Eff. Rate: ${(res.effectiveTaxRate * 100).toFixed(1)}% | Pack: ${info.auditPackFileName}`);
          } catch(e) {
            console.error('Error parsing JSON for', j, e.message);
          }
        });
      });
      getReq.on('error', (err) => console.error('Request error for', j, err.message));
    });
  });

  req.on('error', (err) => console.error('Login error:', err.message));
  req.write(loginData);
  req.end();
}

testAllJurisdictions();
