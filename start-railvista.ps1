$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$site = Join-Path $project 'local-demo'

# Start on Windows itself so Edge and Chrome can reach localhost.
$server = "Set-Location -LiteralPath '$site'; Write-Host 'RailVista is running at http://localhost:3000/' -ForegroundColor Green; python -m http.server 3000 --bind 0.0.0.0"
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit','-Command',$server -WorkingDirectory $site
Start-Sleep -Seconds 3
Start-Process 'http://localhost:3000/'
