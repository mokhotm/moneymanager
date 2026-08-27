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

# 2. Install Docker & Docker Compose if not already installed
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

# 3. Create .env file if it doesn't exist
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

# 4. Build and start containers with docker-compose
echo "🏗️ Building and launching Docker containers..."

# Support both docker compose (v2) and docker-compose (v1)
if command -v docker-compose &> /dev/null; then
    DC="sudo docker-compose"
else
    DC="sudo docker compose"
fi

$DC down --remove-orphans || true
$DC build --no-cache
$DC up -d

# 5. Wait for Database to become healthy
echo "⏳ Waiting for PostgreSQL database to initialize..."
sleep 10

# 6. Apply Prisma Schema to Database
echo "🔄 Synchronizing database schema with Prisma..."
$DC exec -T web npx prisma db push --accept-data-loss || true

echo "=========================================================="
echo "🎉 MoneyManager is successfully running on AWS EC2!"
echo "🌐 Access your app at: http://$(curl -s http://checkip.amazonaws.com)"
echo "=========================================================="
