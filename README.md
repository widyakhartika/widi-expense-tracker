# Widi Expense Tracker

Personal Expense Tracker berbasis web dengan backend NestJS, frontend Next.js, PostgreSQL, Prisma, dan Telegram Bot.

## Stack

- Backend: NestJS 11, Prisma 6, PostgreSQL
- Frontend: Next.js 16, React 19, Tailwind CSS
- Bot: Telegram Bot via grammY
- Runtime: Node.js 20+
- Deployment: Docker Compose

## Struktur Project

```text
widi-expense-tracker/
├── backend/       # NestJS API + Prisma schema/migrations/seed
├── frontend/      # Next.js dashboard + server-side API proxy
├── bot/           # Telegram bot untuk input transaksi cepat
├── docs/          # Dokumentasi setup
├── docker-compose.yml
├── setup.bat
└── setup.sh
```

## Keamanan Penting

Token Telegram yang pernah dibagikan harus dianggap bocor. Revoke token lama di BotFather dan buat token baru sebelum menjalankan bot.

Dashboard tidak lagi menyimpan API key di browser. Frontend memakai route proxy Next.js (`/api/[...path]`) dan API key hanya dibaca dari environment server-side.

## Setup Lokal

Prerequisite:

- Node.js 20.11 atau lebih baru
- Docker Desktop
- npm

Windows:

```bat
setup.bat
```

Linux/macOS:

```bash
chmod +x setup.sh
./setup.sh
```

Setelah setup selesai, jalankan di 3 terminal:

```bash
cd backend && npm run dev
cd bot && npm run dev
cd frontend && npm run dev
```

Akses dashboard:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:3001/health
```

## Environment

Root `.env`:

```env
DB_PASSWORD=...
API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ALLOWED_USER_IDS=8092244206,413201857
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
```

`backend/.env`, `frontend/.env`, dan `bot/.env` dibuat otomatis oleh setup script.

## Database

Perintah utama:

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
npx prisma studio
```

Wallet seed: Cash, BRI, Mandiri, Seabank, Jago, Superbank, Dana, GoPay, ShopeePay, OVO.

## Telegram Bot

Bot hanya berjalan jika dua environment ini terisi:

```env
TELEGRAM_BOT_TOKEN=token-baru-dari-botfather
TELEGRAM_ALLOWED_USER_IDS=id-telegram-anda,id-telegram-user-kedua
```

Contoh input:

```text
makan 25k
kopi 45000
gaji 8jt
grab kantor 15rb
```

Command:

- `/saldo`
- `/ringkasan`
- `/help`
- `/batal`

## Docker Production

Isi `.env` production terlebih dahulu, lalu:

```bash
docker compose --profile prod up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Service:

- PostgreSQL: `5432`
- Backend API: `3001`
- Frontend dashboard: `3000`
- Telegram bot: polling, tanpa port publik

Untuk server Ubuntu publik, pasang reverse proxy dan SSL di depan frontend/backend.

## Fitur MVP

- Multi wallet
- Kategori income/expense
- Income, expense, dan transfer antar wallet
- Dashboard saldo dan ringkasan bulanan
- Riwayat transaksi dengan filter
- Input transaksi via dashboard
- Input transaksi cepat via Telegram bot
- Prisma migration dan seed awal
- Docker Compose untuk local database dan production profile

## Roadmap Berikutnya

- Authentication dashboard yang proper
- Budget bulanan
- Recurring transaction
- Subscription tracker
- Export/import CSV atau Excel
- Goal tabungan
- AI auto categorization
- Backup database otomatis
