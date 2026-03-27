# Installation Guide

This guide helps you set up HumanFirst Control for local development and pilot deployments.

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (or **bun**)
- **Git**
- **Supabase account** (free tier available)

### Optional (Desktop/Agent Development)

- **.NET 8 SDK** (for Windows agent)
- **Windows 10/11** (required for agent and service testing)
- **Visual Studio 2022** or **VS Code**

## 1. Clone the Repository

```bash
git clone https://github.com/humanfirst-ai/humanfirst-control.git
cd humanfirst-control
```

## 2. Install Dependencies

Using npm:

```bash
npm install
```

Or using bun:

```bash
bun install
```

## 3. Environment Setup

Create `.env` from template:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 4. Supabase Setup

1. Create a new project at https://supabase.com
2. Copy project URL and anon key into `.env`
3. Apply migrations from `supabase/migrations/` (via dashboard or CLI)
4. Configure RLS and policies as documented in project docs

Useful docs:
- `docs/SUPABASE_ADMIN_FROM_VSCODE.md`
- `docs/SUPABASE_PROJECT_MIGRATION.md`

## 5. Start Development

```bash
npm run dev
```

Open:
- Web app: http://localhost:5173

## 6. Quality Checks

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm run test
```

## Desktop App Setup (Electron)

Run desktop mode in development:

```bash
npm run desktop:dev
```

Build desktop package:

```bash
npm run desktop:package
```

Create distributable desktop build:

```bash
npm run desktop:dist
```

## Windows Agent Setup (.NET)

Navigate to the agent project:

```powershell
cd agent/ControlPlane.Agent
```

Build release version:

```powershell
dotnet publish -c Release -o publish
```

Install service (Administrator PowerShell required):

```powershell
.\install-service.ps1
```

Check service status:

```powershell
Get-Service ControlPlane.Agent
```

Uninstall service:

```powershell
.\uninstall-service.ps1
```

## Troubleshooting

### Node modules issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port already in use

Change Vite port:

```bash
npm run dev -- --port 3000
```

### Supabase auth/data errors

- Verify URL and anon key in `.env`
- Confirm migrations are applied
- Check RLS policies in Supabase dashboard

### Agent service not starting

- Run PowerShell as Administrator
- Check Windows Event Viewer logs
- Verify .NET 8 runtime is installed

## Production Notes

- Never commit `.env` files or secrets
- Use environment-specific config for staging/production
- Enable secure key rotation for Supabase credentials
- Review `SECURITY.md` before deployment

## Need Help?

- Open an issue in the GitHub repository
- Read docs in `docs/`
- Start a GitHub Discussion for setup questions
