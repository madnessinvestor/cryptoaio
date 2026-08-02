; ─────────────────────────────────────────────────────────────────────────────
; CryptoAIO — Inno Setup Script
; Gera: CryptoAIO-vX.X.X-Setup.exe
; ─────────────────────────────────────────────────────────────────────────────

#define MyAppName      "CryptoAIO"
#define MyAppPublisher "madnessinvestor"
#define MyAppURL       "https://github.com/madnessinvestor/cryptoaio"
#define MyAppExeName   "CryptoAIO.exe"
#define MyAppVersion   GetEnv("APP_VERSION")

[Setup]
AppId={{B3F2A1C4-7D8E-4F5B-9A0C-2E1D3F4G5H6I}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=installer
OutputBaseFilename=CryptoAIO-{#MyAppVersion}-Setup
SetupIconFile=graphics\icon-512.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english";    MessagesFile: "compiler:Default.isl"
Name: "portuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startmenuicon"; Description: "Criar atalho no Menu Iniciar"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copia todo o conteúdo gerado pelo PyInstaller
Source: "dist\CryptoAIO\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Atalho na área de trabalho (opcional)
Name: "{autodesktop}\{#MyAppName}";     Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
; Atalho no menu Iniciar
Name: "{group}\{#MyAppName}";           Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon
; Atalho de desinstalação no menu Iniciar
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"; Tasks: startmenuicon

[Run]
; Abre o app após instalar (opcional)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
