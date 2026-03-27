# Desktop App (Electron)

This repo can run as a desktop app by wrapping the existing Vite/React UI in Electron.

## Dev
- Start Vite + Electron together:
  - `npm.cmd run desktop:dev`

### Windows note (PowerShell execution policy)

If PowerShell blocks `npm` with: `running scripts is disabled on this system`, use CMD wrappers:

- Web build: `scripts\\build-web.cmd`
- Desktop build: `scripts\\build-desktop.cmd`

Or run: `cmd /c npm run desktop:dev`

See: `docs/BUILD_WINDOWS_NO_NPM_PS1.md`

## Package (local)
- Build the Vite UI and package an Electron app directory:
  - `npm.cmd run desktop:package`

This produces an unpacked app under `desktop/dist/package-<timestamp>/win-unpacked/` (no installer).

## Dist (installer)
- Create a Windows installer (NSIS):
  - `npm.cmd run desktop:dist`

Artifacts land under `desktop/dist/dist-<timestamp>/`.

### What to launch

- Installed app: use the Start Menu shortcut **HumanFirst Control** (recommended)
  - Default install location (NSIS, per-user): `%LOCALAPPDATA%\Programs\HumanFirst Control\HumanFirst Control.exe`
  - If you chose a custom install directory during setup, the `.exe` will be there.
- Unpacked build (no install):
  - `desktop/dist/dist-<timestamp>/win-unpacked/HumanFirst Control.exe`

## Cleanup old build artifacts
Over time, `desktop/dist/` accumulates many timestamped `dist-*` and `package-*` folders.

- Preview what would be deleted:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-desktop-dist.ps1 -WhatIf`
- Delete old folders (keeps newest `dist-*` and newest `package-*` by default):
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup-desktop-dist.ps1 -NoConfirm`

If deletion is blocked by `app.asar` being “used by another process”, close the app, close any File Explorer windows opened inside `desktop/dist`, then retry (a reboot may be required).

## Logs (packaged app)
When running a packaged build, the Electron main process writes a log file under the app's user data folder:

- Windows: `C:\Users\<you>\AppData\Roaming\<app-name>\logs\main-<timestamp>.log`

In this repo as currently configured, `<app-name>` is `vite_react_shadcn_ts`, so logs land here:

- `C:\Users\<you>\AppData\Roaming\vite_react_shadcn_ts\logs\main-<timestamp>.log`

This log includes main-process startup events plus renderer `console.*` output to help diagnose "stuck on splash" issues.

Tip: In the desktop app, admins can use the **Desktop Diagnostics → Open Logs Folder** button (Admin Dashboard V2) to open this folder.

### Windows note (Developer Mode / symlinks)
On some Windows setups, `electron-builder` may fail while extracting its `winCodeSign` helper with an error like:
"Cannot create symbolic link : A required privilege is not held by the client".

Fix options:
- Enable **Developer Mode** in Windows (recommended):
  - Settings → Privacy & security → For developers → Developer Mode → On
- Or run the build from an **Administrator** PowerShell.

If you don't need an installer yet, you can still run the unpacked app from `desktop/dist/package-<timestamp>/win-unpacked/`.

Note: Windows code signing is optional for local testing but recommended for real distribution.

## Exam-mode / kiosk direction
Electron can help with:
- kiosk window mode
- always-on-top
- disabling window close/minimize
- disabling copy/paste (renderer)
- global shortcuts (main process)

Emergency exit (safety):
- `Ctrl+Shift+E` disables Electron exam mode.

Admin PIN unlock:
- Set one of these environment variables before running the desktop app:
  - `HF_ADMIN_PIN` (plain PIN; dev-friendly)
  - `HF_ADMIN_PIN_SHA256` (preferred; hex sha256 of the PIN)
- When set, Electron will refuse to disable exam mode without the PIN.

Limitations (important):
- Electron cannot reliably block OS-level shortcuts like `Alt+Tab`.
- For real exam enforcement, combine this app with OS kiosk/device management policies.

But true OS-level exam security typically requires device management policies + OS kiosk features.
