# Zell0 Server Installer Builder
# This script builds a Windows installer for the Zell0 Server application

param(
    [switch]$SkipInnoSetup = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Building Zell0 Server Installer..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = $ScriptDir

# Create output directory
$OutputDir = Join-Path $ProjectDir "dist"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Cyan
}

# Clean previous builds if Force is specified
if ($Force -and (Test-Path $OutputDir)) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    Remove-Item "$OutputDir\*" -Recurse -Force
}

# Check if Inno Setup is available
$InnoSetupPath = $null
$InnoSetupPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
)

foreach ($path in $InnoSetupPaths) {
    if (Test-Path $path) {
        $InnoSetupPath = $path
        break
    }
}

if (-not $InnoSetupPath -and -not $SkipInnoSetup) {
    Write-Host "Inno Setup not found. Attempting to download and install..." -ForegroundColor Yellow
    
    try {
        # Download Inno Setup
        $InnoSetupUrl = "https://jrsoftware.org/download.php/is.exe"
        $InnoSetupInstaller = Join-Path $env:TEMP "innosetup-installer.exe"
        
        Write-Host "Downloading Inno Setup..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $InnoSetupUrl -OutFile $InnoSetupInstaller -UseBasicParsing
        
        Write-Host "Installing Inno Setup..." -ForegroundColor Cyan
        Start-Process -FilePath $InnoSetupInstaller -ArgumentList "/SILENT", "/SUPPRESSMSGBOXES" -Wait
        
        # Check again for Inno Setup
        foreach ($path in $InnoSetupPaths) {
            if (Test-Path $path) {
                $InnoSetupPath = $path
                break
            }
        }
        
        # Clean up installer
        Remove-Item $InnoSetupInstaller -Force -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "Failed to download/install Inno Setup: $($_.Exception.Message)" -ForegroundColor Red
        $SkipInnoSetup = $true
    }
}

# Build with Inno Setup if available
if ($InnoSetupPath -and -not $SkipInnoSetup) {
    Write-Host "Building installer with Inno Setup..." -ForegroundColor Cyan
    Write-Host "Using Inno Setup: $InnoSetupPath" -ForegroundColor Gray
    
    try {
        $IssFile = Join-Path $ProjectDir "Zell0Server-Setup.iss"
        if (-not (Test-Path $IssFile)) {
            Write-Host "Error: Inno Setup script not found: $IssFile" -ForegroundColor Red
            exit 1
        }
        
        # Run Inno Setup compiler
        $process = Start-Process -FilePath $InnoSetupPath -ArgumentList "`"$IssFile`"" -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Host "Inno Setup installer built successfully!" -ForegroundColor Green
            $InstallerPath = Join-Path $OutputDir "Zell0Server-Setup.exe"
            if (Test-Path $InstallerPath) {
                $installerSize = (Get-Item $InstallerPath).Length
                Write-Host "Installer created: $InstallerPath ($([math]::Round($installerSize / 1MB, 2)) MB)" -ForegroundColor Green
            }
        } else {
            Write-Host "Inno Setup compilation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            $SkipInnoSetup = $true
        }
        
    } catch {
        Write-Host "Error building with Inno Setup: $($_.Exception.Message)" -ForegroundColor Red
        $SkipInnoSetup = $true
    }
}

# Fallback: Create self-extracting archive
if ($SkipInnoSetup -or -not $InnoSetupPath) {
    Write-Host "Creating self-extracting archive installer..." -ForegroundColor Cyan
    
    try {
        # Create temporary directory for packaging
        $TempDir = Join-Path $env:TEMP "zell0-installer-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $TempDir -Force
        
        # Copy application files
        $AppFiles = @(
            "package.json",
            "main.js", 
            "index.html",
            "install-and-setup.ps1",
            "setup-firewall.ps1",
            "uninstall.ps1"
        )
        
        foreach ($file in $AppFiles) {
            $sourcePath = Join-Path $ProjectDir $file
            $destPath = Join-Path $TempDir $file
            
            if (Test-Path $sourcePath) {
                Copy-Item $sourcePath $destPath -Force
                Write-Host "Copied: $file" -ForegroundColor Gray
            } else {
                Write-Host "Warning: File not found: $file" -ForegroundColor Yellow
            }
        }
        
        # Create installer script
        $InstallerScript = @"
@echo off
setlocal enabledelayedexpansion

echo Installing Zell0 Server...
echo ===========================

REM Create installation directory
set "INSTALL_DIR=%ProgramFiles%\Zell0Server"
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

REM Copy files
echo Copying application files...
xcopy /Y /Q "%~dp0*" "%INSTALL_DIR%\"

REM Run installation script
echo Running installation script...
powershell.exe -ExecutionPolicy Bypass -File "%INSTALL_DIR%\install-and-setup.ps1"

echo.
echo Installation complete!
echo You can now run Zell0 Server from the Start Menu or Desktop.
echo.
pause
"@
        
        $InstallerScript | Out-File -FilePath (Join-Path $TempDir "install.bat") -Encoding ASCII
        
        # Check for 7-Zip
        $SevenZipPath = $null
        $SevenZipPaths = @(
            "${env:ProgramFiles}\7-Zip\7z.exe",
            "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
        )
        
        foreach ($path in $SevenZipPaths) {
            if (Test-Path $path) {
                $SevenZipPath = $path
                break
            }
        }
        
        if ($SevenZipPath) {
            Write-Host "Creating self-extracting archive with 7-Zip..." -ForegroundColor Cyan
            
            $SfxModule = Join-Path (Split-Path $SevenZipPath) "7zS.sfx"
            $ArchivePath = Join-Path $TempDir "zell0-server.7z"
            $SfxPath = Join-Path $OutputDir "Zell0Server-Installer.exe"
            
            # Create 7z archive
            & $SevenZipPath a -t7z "$ArchivePath" "$TempDir\*" -mx=9
            
            # Create SFX config
            $SfxConfig = @"
;!@Install@!UTF-8!
Title="Zell0 Server Installer"
BeginPrompt="This will install Zell0 Server on your computer.\n\nContinue?"
RunProgram="install.bat"
;!@InstallEnd@!
"@
            
            $SfxConfigPath = Join-Path $TempDir "config.txt"
            $SfxConfig | Out-File -FilePath $SfxConfigPath -Encoding UTF8
            
            # Combine SFX module + config + archive
            if (Test-Path $SfxModule) {
                $command = "copy /b `"$SfxModule`" + `"$SfxConfigPath`" + `"$ArchivePath`" `"$SfxPath`""
                cmd /c $command
                
                if (Test-Path $SfxPath) {
                    $installerSize = (Get-Item $SfxPath).Length
                    Write-Host "Self-extracting installer created: $SfxPath ($([math]::Round($installerSize / 1MB, 2)) MB)" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "7-Zip not found. Creating ZIP archive..." -ForegroundColor Yellow
            
            # Create simple ZIP archive
            $ZipPath = Join-Path $OutputDir "Zell0Server-Portable.zip"
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ZipPath)
            
            if (Test-Path $ZipPath) {
                $zipSize = (Get-Item $ZipPath).Length
                Write-Host "Portable ZIP created: $ZipPath ($([math]::Round($zipSize / 1MB, 2)) MB)" -ForegroundColor Green
            }
        }
        
        # Clean up temporary directory
        Remove-Item $TempDir -Recurse -Force
        
    } catch {
        Write-Host "Error creating self-extracting archive: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Create installation instructions
$ReadmePath = Join-Path $OutputDir "INSTALLATION-INSTRUCTIONS.txt"
$ReadmeContent = @"
Zell0 Server Installation Instructions
=====================================

Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

AUTOMATIC INSTALLATION (Recommended):
1. Double-click the installer executable
2. Follow the installation wizard
3. The server will start automatically after installation

MANUAL INSTALLATION:
1. Extract all files to a folder (e.g., C:\Program Files\Zell0Server)
2. Run 'install-and-setup.ps1' as Administrator
3. The server will be configured and started automatically

WHAT THE INSTALLER DOES:
- Installs Node.js (if not already installed)
- Installs Zell0 Server application
- Configures Windows Firewall rules for port 3000
- Sets up auto-start with Windows
- Creates desktop and Start Menu shortcuts

NETWORK CONFIGURATION:
- Server IP: 172.94.3.216
- Port: 3000
- Protocol: TCP

SYSTEM REQUIREMENTS:
- Windows 10 or later
- Administrator privileges (for installation)
- Internet connection (for Node.js download)

UNINSTALLING:
- Use Windows Add/Remove Programs
- Or run 'uninstall.ps1' from the installation directory

SUPPORT:
For issues or questions, please check the GitHub repository.
"@

$ReadmeContent | Out-File -FilePath $ReadmePath -Encoding UTF8
Write-Host "Installation instructions created: $ReadmePath" -ForegroundColor Cyan

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Output directory: $OutputDir" -ForegroundColor Cyan
Write-Host "Files created:" -ForegroundColor Cyan
Get-ChildItem $OutputDir | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1KB, 1)) KB" }
    Write-Host "  $($_.Name) ($size)" -ForegroundColor Gray
} 