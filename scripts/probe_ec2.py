import subprocess
import time
import sys

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

print("Probing EC2 instance responsiveness...")
sys.stdout.flush()

for attempt in range(1, 15):
    print(f"\nAttempt {attempt}/15: Connecting to 13.61.15.20...")
    sys.stdout.flush()
    res = subprocess.run(
        ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=6', ec2_host, 'uptime && free -h && sudo docker ps'],
        capture_output=True,
        text=True,
        timeout=10
    )
    if res.returncode == 0:
        print("-> EC2 is RESPONDING!")
        print("STDOUT:")
        print(res.stdout)
        break
    else:
        print(f"-> Failed / Waiting: {res.stderr.strip()}")
        time.sleep(4)
