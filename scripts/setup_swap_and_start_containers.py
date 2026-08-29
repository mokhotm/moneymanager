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

print("1. Setting up 4GB Swap file on EC2...")
run_ssh("""
if [ ! -f /swapfile ]; then
    echo "Creating 4GB swapfile..."
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully!"
else
    echo "Swapfile already exists, enabling..."
    sudo swapon /swapfile 2>/dev/null || true
fi
free -h
""")

print("\n2. Checking Docker containers and starting services...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose up -d")

print("\n3. Checking running containers...")
run_ssh("sudo docker ps")

print("\n4. Checking web logs...")
run_ssh("sudo docker logs --tail 25 moneymanager-web")
