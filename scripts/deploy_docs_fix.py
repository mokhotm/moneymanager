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

print("1. Uploading updated documents page & seed script...")
run_scp(r'src\app\documents\page.tsx', '/home/ubuntu/moneymanager/src/app/documents/page.tsx')
run_scp(r'scripts\seed_august_documents.js', '/home/ubuntu/moneymanager/seed_august.js')

print("2. Seeding August documents into database...")
run_ssh("sudo docker cp /home/ubuntu/moneymanager/seed_august.js moneymanager-web:/app/seed_august.js && sudo docker exec moneymanager-web node /app/seed_august.js")

print("3. Building and restarting web container...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose build web && sudo docker compose up -d web")

print("Done!")
