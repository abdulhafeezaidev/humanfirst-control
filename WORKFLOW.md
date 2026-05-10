# 🧑‍💻 HumanFirst Control — Git Workflow Guide

> **Maintainer:** Abdul Hafeez  
> **Repo:** https://github.com/abdulhafeezaidev/humanfirst-control  
> **Branching Model:** GitFlow (main → dev → feature branches)

---

## 📌 Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | ✅ Stable production code only — never commit directly here |
| `dev` | 🔧 Active development — all features merge here first |
| `feature/*` | 🆕 New features (e.g. `feature/login-page`) |
| `fix/*` | 🐛 Bug fixes (e.g. `fix/student-dashboard-crash`) |
| `hotfix/*` | 🚨 Critical production fixes (branch from `main`) |

---

## 🔄 Daily Workflow

### 1. Start Work — Always Pull First
```powershell
git checkout dev
git pull origin dev
```

### 2. Create a Feature Branch
```powershell
git checkout -b feature/your-feature-name
```

### 3. Work & Commit Regularly
```powershell
git add .
git commit -m "feat: describe what you did"
```

### 4. Push Your Feature Branch
```powershell
git push origin feature/your-feature-name
```

### 5. Merge Back to Dev (when feature is done)
```powershell
git checkout dev
git merge feature/your-feature-name
git push origin dev
```

### 6. Release to Main (when dev is stable)
```powershell
git checkout main
git merge dev
git push origin main
git tag -a v1.x.x -m "Release v1.x.x"
git push origin --tags
```

---

## 📝 Commit Message Convention

Use the **Conventional Commits** standard:

| Prefix | Use For |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code cleanup (no behavior change) |
| `docs:` | Documentation updates |
| `style:` | Formatting/CSS only |
| `test:` | Adding or updating tests |
| `chore:` | Build scripts, dependencies |

**Examples:**
```
feat: add student assignment submission page
fix: resolve login redirect loop on mobile
docs: update INSTALL.md with new env variables
refactor: simplify user role fetching logic
```

---

## 🔐 Authentication (PAT Setup)

GitHub requires a Personal Access Token (PAT) — **never use your password**.

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scope: ✅ `repo`
4. Copy the token (starts with `ghp_...`)
5. Windows Credential Manager will save it automatically after first push

```powershell
# Configure Git to use Windows Credential Manager
git config --global credential.helper manager
```

> ⚠️ **Never share your PAT in chat, email, or commit it to code.**

---

## 🚫 What NOT to Do

- ❌ Never `git push --force` on `main` or `dev`
- ❌ Never commit `.env` files (they're in `.gitignore`)
- ❌ Never work directly on `main`
- ❌ Never commit `node_modules/` (already in `.gitignore`)

---

## 🛠️ Useful Commands

```powershell
# Check current status
git status

# See recent commits
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (careful!)
git checkout -- .

# See what's different from remote
git fetch origin
git diff HEAD origin/dev

# Delete a local branch after merging
git branch -d feature/your-feature-name
```

---

## 📋 Before Every Push Checklist

- [ ] Code runs without errors locally
- [ ] No `.env` or secrets in staged files (`git status`)
- [ ] Commit message follows convention (`feat:`, `fix:`, etc.)
- [ ] Pulled latest `dev` before starting work
- [ ] Feature branch is up to date with `dev`

---

*Last updated: May 2026 — Abdul Hafeez*
