# باز کردن مراحل استقرار sanschii.ir — فقط لینک‌ها را باز می‌کند
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/mahyar876/Sanschi-finish'

Write-Host ''
Write-Host '=== سانس‌چی — استقرار آنلاین ===' -ForegroundColor Green
Write-Host ''
Write-Host '1) MongoDB Atlas (رایگان) — کلاستر + Connection String'
Write-Host '2) Render Blueprint — وصل GitHub و MONGO_URI'
Write-Host '3) Custom Domain در Render برای api و سایت'
Write-Host '4) DNS در پنل خرید دامنه .ir'
Write-Host ''

Start-Process 'https://www.mongodb.com/cloud/atlas/register'
Start-Sleep -Seconds 1
Start-Process 'https://dashboard.render.com/select-repo?type=blueprint'
Start-Sleep -Seconds 1
Start-Process "$Repo"

Write-Host 'Atlas: Database → Connect → Drivers → کپی connection string'
Write-Host 'Render: repo را انتخاب کن → render.yaml → MONGO_URI را paste کن'
Write-Host ''
Write-Host 'بعد از deploy سبز:'
Write-Host '  Render → sanschii-api → Shell → npm run seed'
Write-Host '  Render → sanschii-api → Custom Domains → api.sanschii.ir'
Write-Host '  Render → sanschii-web → Custom Domains → sanschii.ir و www'
Write-Host ''
Write-Host 'DNS (پنل دامنه):'
Write-Host '  api     → CNAME که Render برای API می‌دهد'
Write-Host '  @ و www → طبق Render برای sanschii-web'
Write-Host ''
Write-Host 'جزئیات: docs/deploy-sanschii-ir-fa.md'
Write-Host ''
