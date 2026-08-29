import subprocess

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

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

files_to_sync = [
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
]

print("1. Syncing updated files to EC2...")
for local_file, remote_file in files_to_sync:
    run_scp(local_file, remote_file)

print("\n2. Building Next.js Web Container on EC2...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose build web && sudo docker compose up -d web")

print("Done!")
