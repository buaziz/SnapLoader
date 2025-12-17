# VS Code Tasks Reference

This document describes the available VS Code tasks for the SnapLoader project. These tasks can be run via the Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task") or using keyboard shortcuts.

## Available Tasks

### 1. **Start Dev Server** ⚡
**Default Build Task** - Press `Ctrl+Shift+B`

Starts the Angular development server on `http://localhost:4200`.

```bash
Command: npm start
Runs: ng serve
Port: 4200
```

**Features:**
- Background task (keeps running)
- Auto-reloads on file changes
- TypeScript error detection
- Dedicated terminal panel

**Usage:**
- **Keyboard:** `Ctrl+Shift+B`
- **Menu:** Terminal → Run Build Task
- **Command Palette:** Tasks: Run Task → "Start Dev Server"

---

### 2. **Check Node Processes & Ports** 🔍

Displays all Node processes currently running and checks common development ports.

**What it shows:**
- Processes listening on ports: `4200`, `3000`, `8080`, `5000`, `8000`
- Process name, PID, and full path
- All running Node processes with memory usage

**Output Example:**
```
Port  Process    PID    Path
----  -------    ---    ----
4200  node       12345  C:\Program Files\nodejs\node.exe

All Node processes:
Id    ProcessName  Memory(MB)  Path
--    -----------  ----------  ----
12345 node        145.23      C:\Program Files\nodejs\node.exe
```

**Usage:**
- **Command Palette:** Tasks: Run Task → "Check Node Processes & Ports"

---

### 3. **Kill Process on Port 4200** 🛑

Forcefully terminates any process using port 4200 (the default Angular dev server port).

**Use Case:** 
When you get an error like "Port 4200 is already in use" because a previous dev server didn't shut down properly.

**Output:**
- If process found: Kills it and shows confirmation
- If no process: Shows "No process found on port 4200"

**Usage:**
- **Command Palette:** Tasks: Run Task → "Kill Process on Port 4200"

⚠️ **Warning:** This forcefully terminates the process. Any unsaved work in that process will be lost.

---

### 4. **Run Tests** 🧪

Runs Vitest tests in watch mode.

```bash
Command: npm test
Framework: Vitest
Watch Mode: Yes
```

**Features:**
- Background task (keeps running)
- Auto-reruns tests on file changes
- Dedicated terminal panel

**Usage:**
- **Command Palette:** Tasks: Run Task → "Run Tests"

---

### 5. **Production Build** 📦

Creates an optimized production build.

```bash
Command: npm run build
Output: dist/snaploader/browser/
Optimizations: Minification, tree-shaking, bundle budgets
```

**Features:**
- One-time task (completes when done)
- TypeScript error detection
- Bundle size warnings if budgets exceeded

**Usage:**
- **Command Palette:** Tasks: Run Task → "Production Build"

---

## Quick Reference

| Task | Shortcut | Purpose |
|------|----------|---------|
| **Start Dev Server** | `Ctrl+Shift+B` | Start localhost:4200 |
| **Check Ports** | Manual | See what's using ports |
| **Kill Port 4200** | Manual | Free up dev server port |
| **Run Tests** | Manual | Watch mode testing |
| **Production Build** | Manual | Create deployment build |

---

## Common Workflows

### Starting Development

1. **Check if anything is running:**
   ```
   Tasks → Check Node Processes & Ports
   ```

2. **If port 4200 is occupied:**
   ```
   Tasks → Kill Process on Port 4200
   ```

3. **Start dev server:**
   ```
   Ctrl+Shift+B (or Tasks → Start Dev Server)
   ```

4. **Open browser:**
   ```
   Navigate to http://localhost:4200
   ```

### Testing Changes

1. **Start dev server** (if not already running)
2. **Run tests in separate terminal:**
   ```
   Tasks → Run Tests
   ```
3. Make changes - both server and tests auto-reload

### Deployment

1. **Run production build:**
   ```
   Tasks → Production Build
   ```
2. **Check output:**
   ```
   dist/snaploader/browser/
   ```
3. **Deploy to Vercel** (automatic on git push)

---

## PowerShell Commands Reference

These are the underlying PowerShell commands used by the tasks. You can run them directly in the terminal if needed.

### Check Ports Manually

```powershell
# Check specific ports
Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -in 4200,3000,8080} | 
  ForEach-Object { 
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      Port = $_.LocalPort
      Process = $proc.Name
      PID = $_.OwningProcess
      Path = $proc.Path
    }
  } | Format-Table -AutoSize
```

### Check All Node Processes

```powershell
Get-Process node -ErrorAction SilentlyContinue | 
  Select-Object Id, ProcessName, 
    @{Name='Memory(MB)'; Expression={[math]::Round($_.WorkingSet64/1MB,2)}}, 
    Path | 
  Format-Table -AutoSize
```

### Kill Process by Port

```powershell
# Kill process on port 4200
$conn = Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
  Stop-Process -Id $proc.Id -Force
  Write-Host "Killed process on port 4200"
}
```

---

## Troubleshooting

### "Port 4200 is already in use"

**Solution:**
1. Run: **Tasks → Check Node Processes & Ports**
2. Identify the process using port 4200
3. Run: **Tasks → Kill Process on Port 4200**
4. Restart: **Tasks → Start Dev Server** (`Ctrl+Shift+B`)

### Tasks not appearing in VS Code

**Solution:**
1. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Check `.vscode/tasks.json` exists
3. Ensure VS Code is opened at the project root

### "Access Denied" when killing process

**Solution:**
- Run VS Code as Administrator
- Or manually close the dev server terminal

### Dev server won't start

**Checklist:**
1. ✅ Node.js installed? (`node --version`)
2. ✅ Dependencies installed? (`npm install`)
3. ✅ Port 4200 free? (Check Ports task)
4. ✅ No TypeScript errors? (Check terminal output)

---

## Tips & Tricks

### Running Multiple Tasks

You can run multiple tasks simultaneously:
- Dev server in one terminal
- Tests in another terminal
- Both will auto-reload on changes

### Default Build Task

Press `Ctrl+Shift+B` anywhere in VS Code to instantly start the dev server (no need to use Command Palette).

### Task Output

- **Dedicated panel:** Task runs in its own terminal (preserved on completion)
- **Shared panel:** Multiple tasks share one terminal
- **New panel:** Opens fresh terminal each time

### Background vs Foreground

- **Background tasks:** Keep running (dev server, tests)
- **Foreground tasks:** Complete and stop (build, port check)

---

## VS Code Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+B` | Run default build task (Start Dev Server) |
| `Ctrl+Shift+P` | Open Command Palette → "Tasks: Run Task" |
| `` Ctrl+` `` | Toggle terminal panel |
| `Ctrl+Shift+C` | Open external terminal |

---

**Last Updated:** 2025-12-17  
**Project:** SnapLoader v0.0.0
