import subprocess
import json

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@16.171.199.75'

def run_ssh(cmd):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout + res.stderr

print("=== 1. CHECK MONEYFLOW ROW SAMPLE ON EC2 ===")
print(run_ssh("""sudo docker exec moneymanager-postgres psql -U moneymanager -d money_manager -c '
  SELECT id, "sourceRef", "destinationRef", amount, "flowType", "status", "confidence", "createdAt" 
  FROM "MoneyFlow" 
  ORDER BY "createdAt" DESC 
  LIMIT 20;
'"""))

print("\n=== 2. RUN AUDIT_LOCATIONS SCRIPT INSIDE WEB CONTAINER ===")
print(run_ssh("""sudo docker exec moneymanager-web node -e '
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const { resolveSpendingLocations } = require("./src/lib/geoResolver");
  const fs = require("fs");
  const path = require("path");

  async function test() {
    try {
      const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
      console.log("User:", user?.username, user?.id);
      
      const accounts = await prisma.account.findMany({ where: { userId: user.id } });
      console.log("Accounts count:", accounts.length);
      const accIds = accounts.map(a => a.id);
      
      const flows = await prisma.moneyFlow.findMany({
        where: {
          OR: [
            { sourceRef: { in: accIds } },
            { destinationRef: { in: accIds } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
      console.log("Matched user flows:", flows.length);

      const intel = resolveSpendingLocations(flows, {});
      console.log("Physical locations resolved:", intel.physicalLocations.length);
      console.log("Digital services resolved:", intel.digitalServices.length);
      console.log("Total physical spend:", intel.totalPhysicalSpend);
      console.log("Total digital spend:", intel.totalDigitalSpend);

      console.log("\nSample Physical Locations:");
      intel.physicalLocations.slice(0, 5).forEach(l => {
        console.log(` - ${l.merchant} (${l.locationName}): R ${l.amount} (${l.transactionCount} txs)`);
      });
      
      console.log("\nSample Digital Services:");
      intel.digitalServices.slice(0, 5).forEach(d => {
        console.log(` - ${d.serviceName} (${d.category}): R ${d.totalAmount} (${d.transactionCount} txs)`);
      });

    } catch (e) {
      console.error("Error:", e);
    } finally {
      await prisma.$disconnect();
    }
  }
  test();
'"""))
