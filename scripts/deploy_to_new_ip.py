import subprocess

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.60.187.56'

def run_ssh(cmd):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    print(f"\n==========================================")
    print(f"COMMAND: {cmd}")
    print(f"==========================================")
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

print("1. Checking Docker ps on EC2...")
run_ssh("sudo docker ps -a")

print("\n2. Making directories on EC2...")
run_ssh("python3 -c \"import os; os.makedirs('/home/ubuntu/moneymanager/src/app/api/banking/[connectionId]', exist_ok=True); os.makedirs('/home/ubuntu/moneymanager/src/app/api/banking/sync', exist_ok=True); os.makedirs('/home/ubuntu/moneymanager/src/app/banking', exist_ok=True); os.makedirs('/home/ubuntu/moneymanager/src/app/documents', exist_ok=True)\"")

print("\n3. Uploading source files...")
files = [
    (r'src\app\banking\page.tsx', '/home/ubuntu/moneymanager/src/app/banking/page.tsx'),
    (r'src\app\documents\page.tsx', '/home/ubuntu/moneymanager/src/app/documents/page.tsx'),
    (r'src\app\api\documents\route.ts', '/home/ubuntu/moneymanager/src/app/api/documents/route.ts'),
    (r'src\app\api\banking\route.ts', '/home/ubuntu/moneymanager/src/app/api/banking/route.ts'),
    (r'src\app\api\banking\sync\route.ts', '/home/ubuntu/moneymanager/src/app/api/banking/sync/route.ts'),
    (r'src\services\stitchOpenBankingService.ts', '/home/ubuntu/moneymanager/src/services/stitchOpenBankingService.ts'),
    (r'src\services\openBankingAggregator.ts', '/home/ubuntu/moneymanager/src/services/openBankingAggregator.ts'),
    (r'src\components\Sidebar.tsx', '/home/ubuntu/moneymanager/src/components/Sidebar.tsx'),
    (r'src\components\EntitySwitcher.tsx', '/home/ubuntu/moneymanager/src/components/EntitySwitcher.tsx'),
    (r'src\app\api\entities\route.ts', '/home/ubuntu/moneymanager/src/app/api/entities/route.ts'),
    (r'src\app\api\chat\route.ts', '/home/ubuntu/moneymanager/src/app/api/chat/route.ts'),
    (r'scripts\seed_august_documents.js', '/home/ubuntu/moneymanager/seed_august.js'),
]

for l, r in files:
    run_scp(l, r)

print("\nUploading dynamic route [connectionId]...")
run_scp(r'src\app\api\banking\[connectionId]\route.ts', '/home/ubuntu/moneymanager/temp_route.ts')
run_ssh("mv /home/ubuntu/moneymanager/temp_route.ts '/home/ubuntu/moneymanager/src/app/api/banking/[connectionId]/route.ts'")

print("\n4. Starting Docker services if stopped...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose up -d")

print("\n5. Running seed for August documents in DB...")
run_ssh("sudo docker cp /home/ubuntu/moneymanager/seed_august.js moneymanager-web:/app/seed_august.js && sudo docker exec moneymanager-web node /app/seed_august.js")

print("\n6. Building and restarting web container...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose build web && sudo docker compose up -d web")

print("\n7. Final check of running containers...")
run_ssh("sudo docker ps")
