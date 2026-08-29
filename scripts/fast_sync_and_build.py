import subprocess
import zipfile
import os

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@13.61.15.20'

print("1. Creating local source archive (bundle.zip)...")
zip_path = r'C:\Ezzy\Projects\Money\bundle.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(r'C:\Ezzy\Projects\Money\src'):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, r'C:\Ezzy\Projects\Money')
            zipf.write(full_path, rel_path)

print(f"Archive created! Size: {os.path.getsize(zip_path)} bytes")

print("\n2. Uploading bundle.zip to EC2...")
subprocess.run(['scp', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', zip_path, f"{ec2_host}:/home/ubuntu/moneymanager/bundle.zip"], check=True)

print("\n3. Extracting bundle on EC2 and building...")
cmd = "cd /home/ubuntu/moneymanager && unzip -o bundle.zip && rm bundle.zip && sudo docker compose build web && sudo docker compose up -d web"
res = subprocess.run(['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd], capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
if res.stderr:
    print("STDERR:")
    print(res.stderr)

print("\nFinished fast sync & build!")
