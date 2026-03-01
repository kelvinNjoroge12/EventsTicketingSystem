###############################################################
#  EventHub - Seed 5 Events
#  Run AFTER starting servers with start.ps1:
#      .\seed.ps1
###############################################################

$DB_PASSWORD = "your_postgres_password_here"   # <-- same as start.ps1
$DB_NAME     = "eventhub"
$DB_USER     = "postgres"
$DB_HOST     = "localhost"
$DB_PORT     = "5432"

$PYTHON = "C:\Users\lmbua\AppData\Local\Programs\Python\Python310\python.exe"
$BACKEND_DIR = "$PSScriptRoot\eventhub_backend"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "🌱 Seeding EventHub with 5 sample events..." -ForegroundColor Cyan

$env:SECRET_KEY = "your-secret-key-here"
$env:DEBUG = "True"
$env:ALLOWED_HOSTS = "*"
$env:DATABASE_URL = $DATABASE_URL
$env:DJANGO_SETTINGS_MODULE = "config.settings.development"

Set-Location $BACKEND_DIR
& $PYTHON seed_events.py

Write-Host "`n✅ Done! Visit http://localhost:5173/events to see your events." -ForegroundColor Green
