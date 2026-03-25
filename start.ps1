###############################################################
#  Strathmore University - Start All Servers
#  Run this script from any PowerShell window:
#      .\start.ps1
#
#  IMPORTANT: Set your DATABASE_URL below before running!
###############################################################

# â”€â”€ CONFIGURE THESE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$DB_PASSWORD = "your_postgres_password_here"   # <-- change this!
$DB_NAME     = "strathmore_university"
$DB_USER     = "postgres"
$DB_HOST     = "localhost"
$DB_PORT     = "5432"
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$PYTHON = "C:\Users\lmbua\AppData\Local\Programs\Python\Python310\python.exe"
$BACKEND_DIR = "$PSScriptRoot\strathmore_university_backend"
$FRONTEND_DIR = "$PSScriptRoot\app"

$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Strathmore University Dev Server Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# â”€â”€ Start Backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Host "`nðŸ”§ Starting Django backend on http://localhost:8000 ..." -ForegroundColor Green
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

# â”€â”€ Start Frontend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Host "âš›ï¸  Starting Vite frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", @"
  Write-Host 'Vite Frontend' -ForegroundColor Cyan
  cd '$FRONTEND_DIR'
  npm run dev
"@

Write-Host "`nâœ… Both servers launched in separate windows!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nðŸ“¦ To seed 5 sample events, run in this same window:" -ForegroundColor Cyan
Write-Host "   .\seed.ps1" -ForegroundColor White
