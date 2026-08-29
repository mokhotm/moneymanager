import subprocess
import os

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

def run_ssh(cmd):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    print(f"Running SSH: {cmd}")
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.stdout: print(res.stdout)
    if res.stderr: print(res.stderr)
    return res.returncode == 0

def run_scp(local_path, remote_path):
    full_cmd = ['scp', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', local_path, f"{ec2_host}:{remote_path}"]
    print(f"Running SCP: {local_path} -> {remote_path}")
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.stdout: print(res.stdout)
    if res.stderr: print(res.stderr)
    return res.returncode == 0

print("1. Creating directories on EC2...")
run_ssh("python3 -c \"import os; os.makedirs('/home/ubuntu/moneymanager/src/app/api/banking/[connectionId]', exist_ok=True); os.makedirs('/home/ubuntu/moneymanager/src/app/api/banking/sync', exist_ok=True); os.makedirs('/home/ubuntu/moneymanager/src/app/banking', exist_ok=True)\"")

print("2. Uploading files to EC2...")
run_scp(r'src\services\stitchOpenBankingService.ts', '/home/ubuntu/moneymanager/src/services/stitchOpenBankingService.ts')
run_scp(r'src\services\openBankingAggregator.ts', '/home/ubuntu/moneymanager/src/services/openBankingAggregator.ts')
run_scp(r'src\components\Sidebar.tsx', '/home/ubuntu/moneymanager/src/components/Sidebar.tsx')
run_scp(r'src\app\api\banking\route.ts', '/home/ubuntu/moneymanager/src/app/api/banking/route.ts')
run_scp(r'src\app\api\banking\sync\route.ts', '/home/ubuntu/moneymanager/src/app/api/banking/sync/route.ts')
run_scp(r'src\app\api\banking\[connectionId]\route.ts', '/home/ubuntu/moneymanager/temp_route.ts')
run_ssh("mv /home/ubuntu/moneymanager/temp_route.ts '/home/ubuntu/moneymanager/src/app/api/banking/[connectionId]/route.ts'")
run_scp(r'src\app\banking\page.tsx', '/home/ubuntu/moneymanager/src/app/banking/page.tsx')

print("3. Building and restarting web container on EC2...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose build web && sudo docker compose up -d web")

print("\nDeployment Completed Successfully!")
