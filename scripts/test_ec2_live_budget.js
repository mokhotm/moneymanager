const http = require("http");

async function checkLiveBudget() {
  const loginData = JSON.stringify({ username: "mokhotm", password: "Engim002@85590" });
  
  const loginReq = http.request({
    hostname: "127.0.0.1",
    port: 3001,
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
      
      const budgetReq = http.request({
        hostname: "127.0.0.1",
        port: 3001,
        path: "/api/budget?month=2026-08",
        method: "GET",
        headers: {
          "Cookie": cookieHeader
        }
      }, (bRes) => {
        let bBody = "";
        bRes.on("data", chunk => bBody += chunk);
        bRes.on("end", () => {
          try {
            const data = JSON.parse(bBody);
            console.log("\n=== LIVE EC2 BUDGET SUMMARY ===");
            console.log("Total Budgeted:", data.summary?.totalBudgeted);
            console.log("Total Executed:", data.summary?.totalExecuted);
            console.log("Execution %:", data.summary?.executionPercentage);
            console.log("Executed Count:", data.summary?.executedCount, "/", data.summary?.totalItemsCount);
            console.log("\n=== ALL RECONCILED LINE ITEMS ===");
            data.items.forEach(i => {
              console.log(`- [${i.execution?.executionStatus}] ${i.label} (Budget: R ${i.amount}, Cleared: R ${i.execution?.executedAmount}, Ref: ${i.execution?.executionRef})`);
            });
          } catch (e) {
            console.error("Parse error:", e.message, bBody);
          }
        });
      });
      budgetReq.end();
    });
  });
  
  loginReq.write(loginData);
  loginReq.end();
}

checkLiveBudget();
