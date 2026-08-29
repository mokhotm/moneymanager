import subprocess
import json

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@16.171.199.75'

def run_psql(sql):
    cmd = f'sudo docker exec moneymanager-postgres psql -U moneymanager -d money_manager -c "{sql}"'
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout + res.stderr

print("=== 1. USERS & FLOW STATS ON EC2 ===")
print(run_psql('SELECT id, username, email FROM \\"User\\";'))

print("\n=== 2. MONEYFLOW SUMMARY ===")
print(run_psql('SELECT count(*) as total_flows FROM \\"MoneyFlow\\";'))

print("\n=== 3. RECENT FLOWS SAMPLE ===")
print(run_psql('SELECT id, description, amount, \\"createdAt\\" FROM \\"MoneyFlow\\" ORDER BY \\"createdAt\\" DESC LIMIT 15;'))

print("\n=== 4. ACCOUNTS SUMMARY ===")
print(run_psql('SELECT a.id, a.name, a.institution, a.\\"isDebt\\", a.\\"userId\\", u.username FROM \\"Account\\" a LEFT JOIN \\"User\\" u ON a.\\"userId\\" = u.id;'))

print("\n=== 5. CHECK MERCHANT OVERRIDES FILE ON EC2 ===")
full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, 'ls -la /home/ubuntu/moneymanager/merchant_overrides.json']
res = subprocess.run(full_cmd, capture_output=True, text=True)
print(res.stdout + res.stderr)
