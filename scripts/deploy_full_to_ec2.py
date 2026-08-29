import subprocess
import os
import sys

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@16.171.199.75'

def run_local(cmd, description):
    print(f"\n==========================================")
    print(f"LOCAL GATE: {description}")
    print(f"CMD: {cmd}")
    print(f"==========================================")
    res = subprocess.run(cmd, shell=True, text=True)
    if res.returncode != 0:
        print(f"[FAIL] LOCAL GATE FAILED ({description}) with code {res.returncode}. ABORTING DEPLOYMENT.")
        sys.exit(1)
    print(f"[PASS] PASSED: {description}")

def run_ssh(cmd, ignore_error=False):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    print(f"\n==========================================")
    print(f"EC2 CMD: {cmd}")
    print(f"==========================================")
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.stdout: print(res.stdout)
    if res.stderr: print(res.stderr)
    if not ignore_error and res.returncode != 0:
        print(f"[FAIL] EC2 Command failed with exit code: {res.returncode}")
        sys.exit(1)
    return res.returncode == 0

def run_scp(local_path, remote_path):
    full_cmd = ['scp', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', local_path, f"{ec2_host}:{remote_path}"]
    print(f"SCP: {local_path} -> {remote_path}")
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.stdout: print(res.stdout)
    if res.stderr: print(res.stderr)
    return res.returncode == 0

print("\n============================================================")
print("  MONEYMANAGER FULL PRODUCTION DEPLOYMENT TO 16.171.199.75")
print("============================================================\n")

# STEP 1: MANDATORY LOCAL PRE-DEPLOYMENT AUDIT GATE
run_local("npx.cmd tsx scripts/run_all_audits.ts", "Master 6-Pillar Data & Geocoding Audit")
run_local("npx.cmd vitest run tests/spendingLocationRadar.test.ts", "Spending Location Radar Unit Suite")

# STEP 2: GIT PUSH
print("\n[Step 2] Staging, committing and pushing latest changes to GitHub...")
subprocess.run("git add .", shell=True)
subprocess.run('git commit -m "feat(radar): expand SA merchant recognition to 86 locations and add mandatory audit governance"', shell=True)
run_local("git push origin main", "Push to GitHub mokhotm/moneymanager")

# STEP 3: REMOTE CODE UPDATE
print("\n[Step 3] Fetching and updating code on AWS EC2...")
run_ssh("cd /home/ubuntu/moneymanager && git fetch origin && git reset --hard origin/main && git log -1")

# STEP 4: DATABASE MIGRATIONS
print("\n[Step 4] Applying database table schemas & indexes...")
run_scp("scripts/setup_ec2_tables.sql", "/home/ubuntu/moneymanager/setup_ec2_tables.sql")
run_ssh("sudo docker cp /home/ubuntu/moneymanager/setup_ec2_tables.sql moneymanager-postgres:/tmp/setup_ec2_tables.sql && sudo docker exec moneymanager-postgres psql -U moneymanager -d money_manager -f /tmp/setup_ec2_tables.sql")

# STEP 5: REBUILD & RESTART NEXT.JS CONTAINER
print("\n[Step 5] Rebuilding and restarting Next.js web container on EC2...")
run_ssh("cd /home/ubuntu/moneymanager && sudo docker compose build web && sudo docker compose up -d web")

# STEP 6: POST-DEPLOYMENT LIVE AUDIT & VERIFICATION
print("\n[Step 6] Running Live Post-Deployment Smoke & Spending Location Radar Audit...")
run_local("node scripts/test_ec2_live_radar_api.js", "Live EC2 Spending Location Radar Verification")

print("\n============================================================")
print("  DEPLOYMENT & 6-PILLAR AUDIT COMPLETED SUCCESSFULLY!")
print(" Live URL: http://16.171.199.75")
print("============================================================\n")
