# Opens Atlas + Render blueprint pages for sanschii.ir deploy
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/mahyar876/Sanschi-finish'

Write-Host ''
Write-Host '=== Sanschii online deploy ===' -ForegroundColor Green
Write-Host ''
Write-Host 'Steps: Atlas -> Render Blueprint -> Custom domains -> DNS'
Write-Host ''

Start-Process 'https://www.mongodb.com/cloud/atlas/register'
Start-Sleep -Seconds 1
Start-Process 'https://dashboard.render.com/select-repo?type=blueprint'
Start-Sleep -Seconds 1
Start-Process $Repo

Write-Host 'Atlas: copy mongodb+srv connection string'
Write-Host 'Render: pick Sanschi-finish (main) -> paste MONGO_URI'
Write-Host 'After live: API Shell -> npm run seed'
Write-Host 'Custom domains: api.sanschii.ir + sanschii.ir on Render'
Write-Host 'Details: docs/deploy-sanschii-ir-fa.md'
Write-Host ''
