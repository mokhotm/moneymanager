const http = require("http");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", (err) => reject(err));
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function checkLiveRadarWithRetry() {
  const loginData = JSON.stringify({ username: "mokhotm", password: "Engim002@85590" });
  let lastError = null;

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/10] Connecting to live EC2 container...`);
      const loginRes = await makeRequest(
        {
          hostname: "16.171.199.75",
          port: 80,
          path: "/api/auth/login",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(loginData),
          },
          timeout: 5000,
        },
        loginData
      );

      if (loginRes.statusCode === 200) {
        console.log("Login successful. Fetching dashboard data...");
        const cookies = loginRes.headers["set-cookie"];
        const cookieHeader = cookies ? cookies.map((c) => c.split(";")[0]).join("; ") : "";

        const dashRes = await makeRequest({
          hostname: "16.171.199.75",
          port: 80,
          path: "/api/dashboard",
          method: "GET",
          headers: {
            Cookie: cookieHeader,
          },
          timeout: 10000,
        });

        const data = JSON.parse(dashRes.body);
        console.log("\n=== LIVE EC2 DASHBOARD RADAR DATA ===");
        console.log("Physical Locations count:", data.spendingLocations?.length || 0);
        console.log("Digital Services count:", data.digitalServices?.length || 0);
        console.log("Total Physical Spend:", data.spendingIntelligence?.totalPhysicalSpend);
        console.log("Total Digital Spend:", data.spendingIntelligence?.totalDigitalSpend);
        console.log("Top Hub:", data.spendingIntelligence?.topHub);

        if ((data.spendingLocations?.length || 0) > 0) {
          console.log("\n[PASS] Verified live radar data.");
          return true;
        }
      }
    } catch (err) {
      lastError = err;
      console.log(`Container not ready yet (${err.message}). Retrying in 3s...`);
      await sleep(3000);
    }
  }

  console.error("Failed to verify live EC2 after 10 attempts:", lastError);
  process.exit(1);
}

checkLiveRadarWithRetry();
