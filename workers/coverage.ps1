$workers = @(
    "export_worker",
    "notification_worker", 
    "couchdb_worker",
    "rate_limiter",
    "pdf_converter",
    "websocket_server",
    "health_checker"
)

foreach ($worker in $workers) {
    $path = "C:\Users\apothecary\LogisTrack\workers\$worker"
    $outFile = "$path\c.out"
    
    Write-Host "`n=== $worker ===" -ForegroundColor Cyan
    
    Set-Location $path
    
    if (Test-Path $outFile) { Remove-Item $outFile }
    
    go test -count=1 ./... -coverprofile=$outFile
    
    if (Test-Path $outFile) {
        go tool cover -func $outFile
    }
}

Set-Location "C:\Users\apothecary\LogisTrack"