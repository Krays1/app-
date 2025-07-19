[Setup]
AppName=Zell0 Server
AppVersion=1.0.0
AppPublisher=Zell0 Team
AppPublisherURL=https://github.com/your-repo/zell0
AppSupportURL=https://github.com/your-repo/zell0/issues
AppUpdatesURL=https://github.com/your-repo/zell0/releases
DefaultDirName={autopf}\Zell0Server
DefaultGroupName=Zell0 Server
AllowNoIcons=yes
LicenseFile=
InfoBeforeFile=
InfoAfterFile=
OutputDir=dist
OutputBaseFilename=Zell0Server-Setup
SetupIconFile=
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Zell0 Server
UninstallDisplayIcon={app}\assets\icon.ico
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1
Name: "autostart"; Description: "Start Zell0 Server automatically with Windows"; GroupDescription: "Auto-start Options"

[Files]
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "main.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "setup-firewall.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "install-and-setup.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Zell0 Server"; Filename: "node.exe"; Parameters: """{app}\main.js"""; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,Zell0 Server}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Zell0 Server"; Filename: "node.exe"; Parameters: """{app}\main.js"""; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\Zell0 Server"; Filename: "node.exe"; Parameters: """{app}\main.js"""; WorkingDir: "{app}"; Tasks: quicklaunchicon

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\install-and-setup.ps1"""; StatusMsg: "Installing Zell0 Server..."; Flags: runhidden waituntilterminated
Filename: "node.exe"; Parameters: """{app}\main.js"""; Description: "{cm:LaunchProgram,Zell0 Server}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -Command ""& {{ $appPath = '{app}'; if (Test-Path '$appPath\uninstall.ps1') {{ & '$appPath\uninstall.ps1' }} }}"""; Flags: runhidden waituntilterminated

[Code]
function GetUninstallString(): String;
var
  sUnInstPath: String;
  sUnInstallString: String;
begin
  sUnInstPath := ExpandConstant('Software\Microsoft\Windows\CurrentVersion\Uninstall\{#emit SetupSetting("AppId")}_is1');
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    RegQueryStringValue(HKCU, sUnInstPath, 'UninstallString', sUnInstallString);
  Result := sUnInstallString;
end;

function IsUpgrade(): Boolean;
begin
  Result := (GetUninstallString() <> '');
end;

function InitializeSetup(): Boolean;
var
  V: Integer;
  iResultCode: Integer;
  sUnInstallString: String;
begin
  Result := True;
  if RegValueExists(HKEY_LOCAL_MACHINE,'Software\Microsoft\Windows\CurrentVersion\Uninstall\Zell0 Server_is1', 'UninstallString') then
  begin
    V := MsgBox(ExpandConstant('Zell0 Server is already installed. Do you want to uninstall the previous version?'), mbInformation, MB_YESNO);
    if V = IDYES then
    begin
      sUnInstallString := GetUninstallString();
      sUnInstallString := RemoveQuotes(sUnInstallString);
      if Exec(sUnInstallString, '/SILENT /NORESTART /SUPPRESSMSGBOXES','', SW_HIDE, ewWaitUntilTerminated, iResultCode) then
        Result := True
      else
        Result := False;
    end
    else
      Result := False;
  end;
end; 