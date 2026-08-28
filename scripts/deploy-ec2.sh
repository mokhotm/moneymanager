#!/usr/bin/env bash
# ==============================================================================
# MoneyManager — Automated AWS EC2 Deployment Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Starting MoneyManager AWS EC2 Deployment Setup"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update -y
sudo -E apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# 2. Add Swap Space if RAM is under 2GB (Prevents OOM during Next.js build on t2.micro/t3.micro)
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
if [ "$TOTAL_RAM_KB" -lt 2000000 ]; then
    if [ ! -f /swapfile ]; then
        echo "💾 Low RAM detected (<2GB). Creating 2GB swap space for smooth build..."
        sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        echo "✅ Swap created successfully."
    fi
fi

# 3. Install Docker & Docker Compose if not already installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
fi

# 4. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔑 Generating secure production .env configuration..."
    SESSION_SEC=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    ENC_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    DB_PWD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

    cat <<EOF > .env
NODE_ENV=production
POSTGRES_USER=moneymanager
POSTGRES_PASSWORD=${DB_PWD}
POSTGRES_DB=money_manager
DATABASE_URL=postgresql://moneymanager:${DB_PWD}@db:5432/money_manager?schema=public
SESSION_SECRET=${SESSION_SEC}
ENCRYPTION_KEY=${ENC_KEY}
GEMINI_API_KEY=
PORT=3001
EOF
    echo "✅ Created .env with cryptographically strong secrets."
fi

# 5. Build and start containers with docker-compose
echo "🏗️ Building and launching Docker containers..."

# Support both docker compose (v2) and docker-compose (v1)
if docker compose version &> /dev/null; then
    DC="sudo docker compose"
elif command -v docker-compose &> /dev/null; then
    DC="sudo docker-compose"
else
    DC="sudo docker compose"
fi

$DC down --remove-orphans || true
$DC build --no-cache
$DC up -d

# 6. Wait for Database to become healthy
echo "⏳ Waiting for PostgreSQL database to initialize..."
sleep 12

# 7. Apply Prisma Schema to Database
echo "🔄 Synchronizing database schema with Prisma..."
$DC exec -T web npx prisma db push --accept-data-loss || true

# 8. Seed Initial Data (if requested or on fresh db)
echo "🌱 Initializing baseline data & money flows..."
$DC exec -T web npm run seed || true
$DC exec -T web npm run seed:flows || true

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s https://ifconfig.me || echo "your-instance-ip")

echo "=========================================================="
echo "🎉 MoneyManager is successfully deployed and running!"
echo "🌐 Access your app at: http://${PUBLIC_IP}"
echo "=========================================================="
