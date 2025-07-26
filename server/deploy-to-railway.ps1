# Zell0 Server Railway Deployment Script
# This script helps you deploy your server to Railway

Write-Host "🚀 Zell0 Server Railway Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "railway-deployment")) {
    Write-Host "❌ Error: railway-deployment directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the server directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found railway-deployment directory" -ForegroundColor Green

# Check required files
$requiredFiles = @("server.js", "package.json", "railway.json", "README.md")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (-not (Test-Path "railway-deployment\$file")) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✅ All required files present" -ForegroundColor Green

Write-Host "`n📋 Deployment Instructions:" -ForegroundColor Cyan
Write-Host "1. Go to https://railway.app" -ForegroundColor White
Write-Host "2. Sign in with your GitHub account" -ForegroundColor White
Write-Host "3. Click 'New Project'" -ForegroundColor White
Write-Host "4. Select 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "5. Choose your repository" -ForegroundColor White
Write-Host "6. Railway will automatically detect it's a Node.js app" -ForegroundColor White
Write-Host "7. Click 'Deploy'" -ForegroundColor White
Write-Host "8. Wait for deployment to complete" -ForegroundColor White

Write-Host "`n📁 Files to upload to GitHub:" -ForegroundColor Cyan
Write-Host "Make sure these files are in your GitHub repository:" -ForegroundColor White
Write-Host "   - server.js" -ForegroundColor White
Write-Host "   - package.json" -ForegroundColor White
Write-Host "   - railway.json" -ForegroundColor White
Write-Host "   - README.md" -ForegroundColor White

Write-Host "`n🔧 Alternative: Manual Upload" -ForegroundColor Cyan
Write-Host "If you prefer to upload manually:" -ForegroundColor White
Write-Host "1. Go to railway.app" -ForegroundColor White
Write-Host "2. Click 'New Project'" -ForegroundColor White
Write-Host "3. Select 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "4. Choose 'Upload from your computer'" -ForegroundColor White
Write-Host "5. Upload the railway-deployment folder" -ForegroundColor White

Write-Host "`n✅ After deployment:" -ForegroundColor Green
Write-Host "1. Copy the generated Railway URL" -ForegroundColor White
Write-Host "2. Update your Android app's NetworkManager.kt" -ForegroundColor White
Write-Host "3. Update network_security_config.xml" -ForegroundColor White
Write-Host "4. Rebuild and install your APK" -ForegroundColor White

Write-Host "`n🧪 Test your deployment:" -ForegroundColor Cyan
Write-Host "Run: node test-railway-connection.js" -ForegroundColor White
Write-Host "Replace the URL in the test script with your new Railway URL" -ForegroundColor White

Write-Host "`n📞 Need help?" -ForegroundColor Yellow
Write-Host "Check Railway documentation: https://docs.railway.app" -ForegroundColor White
Write-Host "Or check the RAILWAY-DEPLOYMENT-GUIDE.md file" -ForegroundColor White

Write-Host "`n🎉 Good luck with your deployment!" -ForegroundColor Green 