# Setup Guide

## Prerequisite

- Node.js 20.11+
- Docker Desktop
- npm

## Langkah Cepat

```bash
cp .env.example .env
```

Isi `.env`, terutama:

```env
DB_PASSWORD=...
API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_USER_ID=...
```

Jalankan PostgreSQL:

```bash
docker compose up -d db
```

Setup backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Setup frontend:

```bash
cd frontend
npm install
npm run dev
```

Setup bot:

```bash
cd bot
npm install
npm run dev
```

## Verifikasi

Health check:

```bash
curl http://localhost:3001/health
```

API protected:

```bash
curl -H "X-API-Key: API_KEY_ANDA" http://localhost:3001/api/wallets
```

Dashboard:

```text
http://localhost:3000
```

## Prisma Studio

```bash
cd backend
npx prisma studio
```

## Catatan Security

- Jangan commit `.env`.
- Gunakan token Telegram baru dari BotFather.
- Frontend menggunakan proxy server-side, jadi jangan membuat `NEXT_PUBLIC_API_KEY`.
- Untuk production, gunakan reverse proxy dengan HTTPS.
