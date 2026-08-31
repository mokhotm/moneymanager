# Complete AWS Cloud Deployment Guide for MoneyManager

This guide provides end-to-end instructions for deploying MoneyManager to Amazon Web Services (AWS).

---

## 📋 Table of Contents
1. [Option 1: AWS Free Tier EC2 (Recommended - $0/Month)](#option-1-aws-free-tier-ec2)
2. [Option 2: AWS Amplify Hosting (Serverless Next.js)](#option-2-aws-amplify-hosting)
3. [Option 3: AWS App Runner + RDS (Enterprise Containers)](#option-3-aws-app-runner--rds)
4. [Domain & SSL Setup (Nginx + Let's Encrypt)](#domain--ssl-setup-nginx--lets-encrypt)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Maintenance, Backups & Updates](#maintenance-backups--updates)

---

## Option 1: AWS Free Tier EC2 (Recommended - $0/Month)

This option uses the **AWS Free Tier** (12 months free, 750 hours/month on `t2.micro` or `t3.micro` + 30GB EBS storage). It hosts both the Next.js web application and PostgreSQL database inside Docker containers.

### Step 1: Launch an EC2 Instance
1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2).
2. Click **Launch Instance**.
3. **Name**: `moneymanager-server`.
4. **Application and OS Images (AMI)**: Select **Ubuntu Server 24.04 LTS (HVM)**, SSD Volume Type.
5. **Instance Type**: Select `t2.micro` (or `t3.micro` if in supported regions - Free tier eligible).
6. **Key pair (login)**: Choose an existing key pair or click **Create new key pair** (e.g. `moneymanager-key.pem`).
7. **Network settings / Security Group**:
   - Check **Allow SSH traffic from anywhere** (or your IP).
   - Check **Allow HTTP traffic from the internet** (Port 80).
   - Check **Allow HTTPS traffic from the internet** (Port 443).
   - Click **Edit** and add a custom TCP rule for **Port 3001** (Source: `0.0.0.0/0`).
8. **Configure storage**: Set to `30 GiB` gp3 (Free tier allows up to 30 GB EBS).
9. Click **Launch Instance**.

---

### Step 2: Connect to Your EC2 Instance
Open your terminal (PowerShell, CMD, or Terminal) where your `.pem` key is saved:

```bash
# Set key permissions (Linux/macOS)
chmod 400 moneymanager-key.pem

# Connect to EC2
ssh -i moneymanager-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```
*(Or click **Connect** -> **EC2 Instance Connect** in the AWS Console for a one-click browser terminal).*

---

### Step 3: Clone & Deploy MoneyManager
Inside the EC2 terminal, run:

```bash
# 1. Clone your project repository
git clone <YOUR-GITHUB-REPO-URL> moneymanager
cd moneymanager

# 2. Make the deployment script executable
chmod +x scripts/deploy-ec2.sh

# 3. Run the automated deployment script
./scripts/deploy-ec2.sh
```

The script will automatically:
- Install Docker Engine and Docker Compose.
- Generate secure cryptographic secrets for `SESSION_SECRET`, `ENCRYPTION_KEY`, and PostgreSQL password.
- Build the optimized Next.js 16 standalone container.
- Launch the PostgreSQL 16 database container with persistent EBS storage.
- Synchronize database tables with Prisma.

Once complete, open your browser and navigate to:
```
http://<YOUR-EC2-PUBLIC-IP>:3001
```

---

## Domain & SSL Setup (Nginx + Let's Encrypt)

To serve MoneyManager over `https://yourdomain.com` with free auto-renewing SSL certificates:

### 1. Install Nginx and Certbot on EC2
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/moneymanager`:
```bash
sudo nano /etc/nginx/sites-available/moneymanager
```

Paste the following configuration (replace `yourdomain.com` with your domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/moneymanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Obtain Free Let's Encrypt SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot will configure SSL automatically and set up automatic renewal.

---

## Option 2: AWS Amplify Hosting (Serverless Next.js)

AWS Amplify Gen 2 natively supports Next.js 14/15/16 App Router with zero server management.

1. **Database**: Create a database using AWS RDS PostgreSQL or a serverless PostgreSQL provider like [Neon](https://neon.tech) / [Supabase](https://supabase.com).
2. **AWS Amplify Console**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify).
   - Click **Deploy an app** -> Select **GitHub** repository.
   - Select your MoneyManager repository and `main` branch.
   - In **Environment Variables**, add:
     - `DATABASE_URL`: Your PostgreSQL connection string.
     - `SESSION_SECRET`: 32-character random string.
     - `ENCRYPTION_KEY`: 32-character random string.
     - `GEMINI_API_KEY`: Your Gemini API Key (optional).
   - Click **Save and Deploy**.
3. Amplify will automatically build and deploy the application on a global CDN with free HTTPS.

---

## Option 3: AWS App Runner + RDS (Enterprise Containers)

AWS App Runner provides auto-scaling containers with zero infrastructure maintenance.

1. **Build and push image to AWS ECR**:
   ```bash
   aws ecr create-repository --repository-name moneymanager
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com
   docker build -t moneymanager .
   docker tag moneymanager:latest <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/moneymanager:latest
   docker push <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/moneymanager:latest
   ```
2. **Create App Runner Service**:
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner).
   - Select the ECR image.
   - Configure Port `3001`.
   - Set environment variables (`DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`).
   - Click **Create & Deploy**.

---

## Environment Variables Reference

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | **Yes** | `postgresql://user:pwd@host:5432/db?schema=public` |
| `SESSION_SECRET` | 32-char key for authentication cookies | **Yes** | `e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4` |
| `ENCRYPTION_KEY` | 32-char key for BYOK credentials vault | **Yes** | `f1e2d3c4b5a697887766554433221100` |
| `GEMINI_API_KEY` | Google Gemini API Key for AI Agents | Optional | `AIzaSy...` |
| `PORT` | Application HTTP Port | Default: 3001 | `3001` |
| `NODE_ENV` | Environment identifier | Default: production | `production` |

---

## Maintenance, Backups & Automated Deployments

### Automated 1-Click Production Deployment Pipeline
MoneyManager includes a zero-regression, pre-audited deployment pipeline that builds and verifies the application before shipping to EC2:

```bash
python scripts/deploy_full_to_ec2.py
```

This automated deployment script executes:
1. **Local Gate 1**: Master 6-Pillar Data & Geocoding Audit (`npx tsx scripts/run_all_audits.ts`)
2. **Local Gate 2**: Vitest Regression Suite across all 13 corrected issues (`npx vitest run tests/regressionAuditSuite.test.ts`)
3. **Local Gate 3**: Spending Location Radar Unit Suite (`npx vitest run tests/spendingLocationRadar.test.ts`)
4. **Git Sync**: Automatic stage, commit, and push to GitHub `main`
5. **EC2 Orchestration**: Remote SSH git pull and zero-downtime container rebuild (`docker compose up -d --build`)
6. **Live Smoke Gate**: Remote live smoke test and authenticated API radar verification on `http://16.171.199.75`

### Manual Remote EC2 Update
If executing directly on the EC2 instance:
```bash
cd ~/moneymanager
git pull origin main
sudo docker compose down
sudo docker compose up -d --build
sudo docker compose exec -T web npx prisma db push
```

### PostgreSQL Database Backup & Restore
To create an instant backup of your production database:
```bash
sudo docker compose exec -T db pg_dump -U moneymanager money_manager > backup_$(date +%Y%m%d_%H%M%S).sql
```

To restore from a backup:
```bash
cat backup_YYYYMMDD_HHMMSS.sql | sudo docker compose exec -T db psql -U moneymanager -d money_manager
```

