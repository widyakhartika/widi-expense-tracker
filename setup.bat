@echo off
setlocal enabledelayedexpansion

echo Widi Expense Tracker - local setup

where node >nul 2>nul || (
  echo Node.js belum terinstall.
  pause
  exit /b 1
)
where docker >nul 2>nul || (
  echo Docker Desktop belum terinstall.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 20 (
  echo Node.js minimal v20. Versi saat ini:
  node -v
  pause
  exit /b 1
)

if not exist ".env" (
  copy .env.example .env >nul
  echo .env dibuat dari template.
  echo Edit .env sekarang untuk isi DB_PASSWORD, API_KEY, TELEGRAM_BOT_TOKEN, dan TELEGRAM_ALLOWED_USER_IDS.
  pause
)

for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
  if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
  if "%%a"=="API_KEY" set API_KEY=%%b
  if "%%a"=="TELEGRAM_BOT_TOKEN" set TELEGRAM_BOT_TOKEN=%%b
  if "%%a"=="TELEGRAM_ALLOWED_USER_IDS" set TELEGRAM_ALLOWED_USER_IDS=%%b
  if "%%a"=="TELEGRAM_USER_ID" set TELEGRAM_USER_ID=%%b
)

if "%TELEGRAM_ALLOWED_USER_IDS%"=="" set TELEGRAM_ALLOWED_USER_IDS=%TELEGRAM_USER_ID%

(
  echo DATABASE_URL="postgresql://widi:%DB_PASSWORD%@localhost:5432/expense_tracker"
  echo API_KEY="%API_KEY%"
  echo PORT=3001
  echo NODE_ENV=development
  echo FRONTEND_URL="http://localhost:3000"
) > backend\.env

(
  echo API_URL="http://localhost:3001"
  echo API_KEY="%API_KEY%"
) > frontend\.env

(
  echo TELEGRAM_BOT_TOKEN="%TELEGRAM_BOT_TOKEN%"
  echo TELEGRAM_ALLOWED_USER_IDS="%TELEGRAM_ALLOWED_USER_IDS%"
  echo API_BASE_URL="http://localhost:3001"
  echo API_KEY="%API_KEY%"
) > bot\.env

docker compose up -d db
timeout /t 10 /nobreak >nul

cd backend
call npm install || goto error
call npx prisma generate || goto error
call npx prisma migrate deploy || goto error
call npx prisma db seed || goto error
cd ..

cd bot
call npm install || goto error
cd ..

cd frontend
call npm install || goto error
cd ..

echo Setup selesai.
echo Jalankan:
echo   cd backend ^&^& npm run dev
echo   cd bot ^&^& npm run dev
echo   cd frontend ^&^& npm run dev
pause
exit /b 0

:error
echo Setup gagal. Cek error di atas.
pause
exit /b 1
