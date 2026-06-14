#!/bin/bash
set -euo pipefail

echo "Widi Expense Tracker - local setup"

command -v node >/dev/null 2>&1 || { echo "Node.js belum terinstall"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm belum terinstall"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker belum terinstall"; exit 1; }

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js minimal v20. Versi saat ini: $(node -v)"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  DB_PASS=$(openssl rand -hex 16 2>/dev/null || echo "widi_secure_$(date +%s)")
  APP_KEY=$(openssl rand -hex 32 2>/dev/null || echo "apikey_$(date +%s)")
  sed -i "s/ganti_password_kuat_disini/$DB_PASS/" .env
  sed -i "s/ganti_dengan_key_kuat/$APP_KEY/" .env
  echo ".env dibuat. Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_ALLOWED_USER_IDS sebelum menjalankan bot."
fi

set -a
source .env
set +a

cat > backend/.env <<EOF
DATABASE_URL="postgresql://widi:${DB_PASSWORD}@localhost:5432/expense_tracker"
API_KEY="${API_KEY}"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
EOF

cat > frontend/.env <<EOF
API_URL="http://localhost:3001"
API_KEY="${API_KEY}"
EOF

cat > bot/.env <<EOF
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_ALLOWED_USER_IDS="${TELEGRAM_ALLOWED_USER_IDS:-${TELEGRAM_USER_ID:-}}"
API_BASE_URL="http://localhost:3001"
API_KEY="${API_KEY}"
EOF

docker compose up -d db

echo "Menunggu PostgreSQL siap..."
for i in $(seq 1 20); do
  if docker compose exec db pg_isready -U widi -d expense_tracker >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..

cd bot
npm install
cd ..

cd frontend
npm install
cd ..

echo "Setup selesai."
echo "Jalankan di 3 terminal:"
echo "  cd backend && npm run dev"
echo "  cd bot && npm run dev"
echo "  cd frontend && npm run dev"
