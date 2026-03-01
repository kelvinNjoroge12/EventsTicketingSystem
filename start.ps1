###############################################################
#  EventHub - Start All Servers
#  Run this script from any PowerShell window:
#      .\start.ps1
#
#  IMPORTANT: Set your DATABASE_URL below before running!
###############################################################

# ── CONFIGURE THESE ───────────────────────────────────────────
$DB_PASSWORD = "your_postgres_password_here"   # <-- change this!
$DB_NAME     = "eventhub"
$DB_USER     = "postgres"
$DB_HOST     = "localhost"
$DB_PORT     = "5432"
# ─────────────────────────────────────────────────────────────

$PYTHON = "C:\Users\lmbua\AppData\Local\Programs\Python\Python310\python.exe"
$BACKEND_DIR = "$PSScriptRoot\eventhub_backend"
$FRONTEND_DIR = "$PSScriptRoot\app"

$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EventHub Dev Server Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Start Backend ─────────────────────────────────────────────
Write-Host "`n🔧 Starting Django backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", @"
  Write-Host 'Django Backend' -ForegroundColor Cyan
  cd '$BACKEND_DIR'
  `$env:SECRET_KEY='your-secret-key-here'
  `$env:DEBUG='True'
  `$env:ALLOWED_HOSTS='*'
  `$env:DATABASE_URL='$DATABASE_URL'
  `$env:DJANGO_SETTINGS_MODULE='config.settings.development'
  & '$PYTHON' manage.py runserver 8000
"@

Start-Sleep -Seconds 3

# ── Start Frontend ────────────────────────────────────────────
Write-Host "⚛️  Starting Vite frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", @"
  Write-Host 'Vite Frontend' -ForegroundColor Cyan
  cd '$FRONTEND_DIR'
  npm run dev
"@

Write-Host "`n✅ Both servers launched in separate windows!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`n📦 To seed 5 sample events, run in this same window:" -ForegroundColor Cyan
Write-Host "   .\seed.ps1" -ForegroundColor White
