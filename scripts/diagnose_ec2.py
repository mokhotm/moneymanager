import subprocess
import sys

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

def run_ssh(cmd):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', ec2_host, cmd]
    print(f"\n==========================================")
    print(f"COMMAND: {cmd}")
    print(f"==========================================")
    sys.stdout.flush()
    res = subprocess.run(full_cmd, capture_output=True, text=True, timeout=10)
    print("STDOUT:")
    print(res.stdout if res.stdout else "<empty>")
    if res.stderr:
        print("STDERR:")
        print(res.stderr)
    sys.stdout.flush()
    return res.stdout

try:
    print("=== 1. CHECKING DOCKER PS ===")
    sys.stdout.flush()
    run_ssh("sudo docker ps -a")

    print("=== 2. CHECKING DOCKER LOGS (moneymanager-web) ===")
    sys.stdout.flush()
    run_ssh("sudo docker logs --tail 50 moneymanager-web")

    print("=== 3. CHECKING DOCKER LOGS (moneymanager-postgres) ===")
    sys.stdout.flush()
    run_ssh("sudo docker logs --tail 30 moneymanager-postgres")
except Exception as e:
    print(f"Exception: {e}")
    sys.stdout.flush()
