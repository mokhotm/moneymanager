import subprocess

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

print("Uploading updated files...")
run_scp(r'src\app\api\entities\route.ts', '/home/ubuntu/moneymanager/src/app/api/entities/route.ts')
run_scp(r'src\components\EntitySwitcher.tsx', '/home/ubuntu/moneymanager/src/components/EntitySwitcher.tsx')

print("Copying into container and restarting...")
run_ssh("sudo docker cp /home/ubuntu/moneymanager/src/app/api/entities/route.ts moneymanager-web:/app/src/app/api/entities/route.ts")
run_ssh("sudo docker cp /home/ubuntu/moneymanager/src/components/EntitySwitcher.tsx moneymanager-web:/app/src/components/EntitySwitcher.tsx")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose restart web")

print("Done!")
