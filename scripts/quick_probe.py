import subprocess
import time

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

print("Probing EC2 instance...")
for attempt in range(1, 10):
    print(f"Attempt {attempt}/10...")
    res = subprocess.run(['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=4', ec2_host, 'uptime && free -h'], capture_output=True, text=True)
    if res.returncode == 0:
        print("EC2 is UP!")
        print(res.stdout)
        break
    else:
        print("Failed / Waiting...")
        time.sleep(3)
