const http = require("http");

async function checkLiveRadar() {
  const loginData = JSON.stringify({ username: "mokhotm", password: "Engim002@85590" });
  
  const loginReq = http.request({
    hostname: "16.171.199.75",
    port: 80,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(loginData)
    }
  }, (res) => {
    const cookies = res.headers["set-cookie"];
    let body = "";
    res.on("data", chunk => body += chunk);
    res.on("end", () => {
      console.log("Login status:", res.statusCode);
      const cookieHeader = cookies ? cookies.map(c => c.split(";")[0]).join("; ") : "";
      
      const dashReq = http.request({
        hostname: "16.171.199.75",
        port: 80,
        path: "/api/dashboard",
        method: "GET",
        headers: {
          "Cookie": cookieHeader
        }
      }, (dRes) => {
        let dBody = "";
        dRes.on("data", chunk => dBody += chunk);
        dRes.on("end", () => {
          try {
            const data = JSON.parse(dBody);
            console.log("\n=== LIVE EC2 DASHBOARD RADAR DATA ===");
            console.log("Physical Locations count:", data.spendingLocations?.length || 0);
            console.log("Digital Services count:", data.digitalServices?.length || 0);
            console.log("Total Physical Spend:", data.spendingIntelligence?.totalPhysicalSpend);
            console.log("Total Digital Spend:", data.spendingIntelligence?.totalDigitalSpend);
            console.log("Top Hub:", data.spendingIntelligence?.topHub);

            console.log("\n=== PHYSICAL SPENDING LOCATIONS ON RADAR ===");
            (data.spendingLocations || []).forEach((loc, idx) => {
              console.log(`[${idx + 1}] ${loc.merchant} | ${loc.locationName}`);
              console.log(`    City/Suburb: ${loc.suburb}, ${loc.city} (${loc.region})`);
              console.log(`    Lat: ${loc.lat}, Lng: ${loc.lng} | Amount: R ${loc.amount} | Txs: ${loc.transactionCount} | Date: ${loc.date}`);
              if (loc.recentTransactions && loc.recentTransactions.length > 0) {
                console.log(`    Sample Tx: ${loc.recentTransactions[0].date} | R ${loc.recentTransactions[0].amount} | ${loc.recentTransactions[0].description}`);
              }
            });

            console.log("\n=== DIGITAL SERVICES ON RADAR ===");
            (data.digitalServices || []).forEach((dig, idx) => {
              console.log(`[${idx + 1}] ${dig.serviceName} | Category: ${dig.category} | Amount: R ${dig.totalAmount} | Txs: ${dig.transactionCount} | LastDate: ${dig.lastDate}`);
            });
          } catch (e) {
            console.error("Parse error:", e.message, dBody);
          }
        });
      });
      dashReq.end();
    });
  });
  
  loginReq.write(loginData);
  loginReq.end();
}

checkLiveRadar();
