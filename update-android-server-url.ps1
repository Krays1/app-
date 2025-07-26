# Update Android App Server URL Script
# This script helps you update your Android app with a new Railway server URL

param(
    [Parameter(Mandatory=$true)]
    [string]$NewServerUrl
)

Write-Host "🔧 Updating Android App Server URL" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Validate URL format
if (-not $NewServerUrl.StartsWith("https://")) {
    Write-Host "❌ Error: URL must start with https://" -ForegroundColor Red
    exit 1
}

# Extract domain from URL
$domain = $NewServerUrl.Replace("https://", "").Replace("http://", "")

Write-Host "✅ New Server URL: $NewServerUrl" -ForegroundColor Green
Write-Host "✅ Domain: $domain" -ForegroundColor Green

# Update NetworkManager.kt
$networkManagerFile = "..\app\src\main\java\com\example\zell0\NetworkManager.kt"
if (Test-Path $networkManagerFile) {
    Write-Host "`n📝 Updating NetworkManager.kt..." -ForegroundColor Cyan
    
    $content = Get-Content $networkManagerFile -Raw
    $updatedContent = $content -replace 'private const val SERVER_URL = "https://[^"]*"', "private const val SERVER_URL = `"$NewServerUrl`""
    
    Set-Content $networkManagerFile $updatedContent -Encoding UTF8
    Write-Host "✅ Updated NetworkManager.kt" -ForegroundColor Green
} else {
    Write-Host "❌ NetworkManager.kt not found at: $networkManagerFile" -ForegroundColor Red
}

# Update network_security_config.xml
$networkConfigFile = "..\app\src\main\res\xml\network_security_config.xml"
if (Test-Path $networkConfigFile) {
    Write-Host "`n📝 Updating network_security_config.xml..." -ForegroundColor Cyan
    
    $content = Get-Content $networkConfigFile -Raw
    $updatedContent = $content -replace '<domain includeSubdomains="true">[^<]*</domain>', "<domain includeSubdomains=`"true`">$domain</domain>"
    
    Set-Content $networkConfigFile $updatedContent -Encoding UTF8
    Write-Host "✅ Updated network_security_config.xml" -ForegroundColor Green
} else {
    Write-Host "❌ network_security_config.xml not found at: $networkConfigFile" -ForegroundColor Red
}

Write-Host "`n✅ Server URL update complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open Android Studio" -ForegroundColor White
Write-Host "2. Clean and rebuild your project" -ForegroundColor White
Write-Host "3. Generate a new APK" -ForegroundColor White
Write-Host "4. Install the APK on your device" -ForegroundColor White
Write-Host "5. Test the connection" -ForegroundColor White

Write-Host "`n🧪 Test the connection:" -ForegroundColor Yellow
Write-Host "Run: node test-railway-connection.js" -ForegroundColor White
Write-Host "Make sure to update the URL in the test script first!" -ForegroundColor White

Write-Host "`n🎉 Your Android app should now connect to the new Railway server!" -ForegroundColor Green 