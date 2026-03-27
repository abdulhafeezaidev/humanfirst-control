# HumanFirst Control

![HumanFirst logo](public/humanfirst-logo.png)

[![GitHub Stars](https://img.shields.io/github/stars/humanfirst-ai/humanfirst-control?style=social)](https://github.com/humanfirst-ai/humanfirst-control)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-success)](https://nodejs.org/)
[![.NET](https://img.shields.io/badge/.NET-8.0-blue)](https://dotnet.microsoft.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

Ethical AI usage control for education. HumanFirst Control enforces exam and focus integrity through allowlist policies, not surveillance.

## Vision

HumanFirst Control helps educational institutions run fair, policy-based exam and focus environments while respecting student privacy.

HumanFirst is a startup at NIC Faisalabad, governed by Founders Institute. We are building transparent and privacy-respecting technology for education.

## Principles

- Enforcement without surveillance
- Transparent policy enforcement
- Student privacy protection
- Institutional control and trust
- Open-source collaboration

## What This Project Does

- Exam and focus mode with time-based policy activation
- App allowlist enforcement on managed devices
- Domain allowlist and network policy checks
- Admin dashboard for policy lifecycle and monitoring
- Student transparency view for active restrictions
- Windows enforcement agent for endpoint execution

## What This Project Does Not Do

- No content reading
- No keystroke logging
- No screen recording
- No behavior spying
- No automatic cheating accusations

## Architecture

```
React Web App  <->  Supabase (Auth/DB/Edge Functions)  <->  Windows Agent
```

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind, shadcn/ui
- Backend: Supabase (Postgres, RLS, Auth, Edge Functions)
- Agent: .NET 8 Windows Service
- Desktop: Electron
- Testing: Vitest

## Quick Start

### Prerequisites

- Node.js 18+
- npm (or bun)
- Git
- Supabase project

### Setup

```bash
git clone https://github.com/humanfirst-ai/humanfirst-control.git
cd humanfirst-control
npm install
cp .env.example .env
npm run dev
```

Add your Supabase credentials in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Windows Agent

```powershell
cd agent/ControlPlane.Agent
dotnet publish -c Release -o publish
.\install-service.ps1
Get-Service ControlPlane.Agent
```

## Development Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run desktop:dev
npm run desktop:package
npm run desktop:dist
```

## Project Structure

```
src/                     React web app
agent/ControlPlane.Agent Windows enforcement agent (.NET)
electron/                Desktop wrapper
supabase/                Migrations and edge functions
scripts/                 Build and utility scripts
docs/                    Project and deployment documentation
```

## Open Source

We welcome contributions. See CONTRIBUTING.md, CODE_OF_CONDUCT.md, and SECURITY.md.

## License

MIT. See LICENSE.
