# Build on Windows when `npm` is blocked in PowerShell

If you see:

> `npm.ps1 cannot be loaded because running scripts is disabled on this system`

It’s a PowerShell execution policy issue. You have 3 options:

## Option A (no policy change): run npm via CMD
From PowerShell, run:

- `cmd /c npm run build`
- `cmd /c npm run build:desktop`

Or run the helper scripts:

- `scripts\\build-web.cmd`
- `scripts\\build-desktop.cmd`

## Option B: run Vite directly with Node
This avoids npm entirely (requires `node_modules` already installed):

- `node scripts\\vite-build.mjs build`
- `node scripts\\vite-build.mjs build --mode desktop`

## Option C (recommended if you can): allow local scripts
Run PowerShell as Administrator, then:

- `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

Close and reopen PowerShell, then `npm run build` will work.
