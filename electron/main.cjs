const { app, BrowserWindow, BrowserView, ipcMain, session, shell, globalShortcut, powerMonitor } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const isDev = !app.isPackaged;

// Keep dev/runtime behavior deterministic while debugging webview layout issues.
app.commandLine.appendSwitch('disable-http-cache');

let logFilePath = null;
let logStream = null;
let consolePatched = false;

function safeToString(value) {
  try {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[unprintable]';
    }
  }
}

function logToFile(level, args) {
  try {
    if (!logStream) return;
    const ts = new Date().toISOString();
    const msg = Array.from(args || []).map(safeToString).join(' ');
    logStream.write(`${ts} ${level} ${msg}\n`);
  } catch {
    // ignore
  }
}

function patchConsoleToLogFile() {
  if (consolePatched) return;
  consolePatched = true;

  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args) => {
    orig.log(...args);
    logToFile('[INFO ]', args);
  };
  console.info = (...args) => {
    orig.info(...args);
    logToFile('[INFO ]', args);
  };
  console.warn = (...args) => {
    orig.warn(...args);
    logToFile('[WARN ]', args);
  };
  console.error = (...args) => {
    orig.error(...args);
    logToFile('[ERROR]', args);
  };
}

function initFileLogging() {
  if (isDev) return;

  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    logFilePath = path.join(logsDir, `main-${stamp}.log`);
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    patchConsoleToLogFile();

    console.log('[log] file logging enabled');
    console.log('[log] logFilePath', logFilePath);
    console.log('[log] versions', {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
    });
    console.log('[log] app', {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      userData: app.getPath('userData'),
    });

    process.on('uncaughtException', (err) => {
      console.error('[process] uncaughtException', err);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('[process] unhandledRejection', reason);
    });
  } catch (e) {
    // If logging fails, do not prevent app start.
    try {
      // eslint-disable-next-line no-console
      console.error('[log] failed to init file logging', e);
    } catch {
      // ignore
    }
  }
}

function getLogsDir() {
  try {
    return path.join(app.getPath('userData'), 'logs');
  } catch {
    return null;
  }
}

let mainWindow = null;
let splashWindow = null;
let examModeEnabled = false;
let assignmentModeEnabled = false;
let isQuitting = false;
let shutdownCleanupDone = false;
let agentPolicyEnabled = false;
let assignmentBrowserView = null;
let browserViewBounds = { x: 0, y: 0, width: 0, height: 0 };
let browserViewHidden = false;

const BLOCKED_DOMAIN_PATTERNS = [
  'openai.com',
  'chat.openai.com',
  'chatgpt.com',
  'deepresearch.openai.com',
  'claude.ai',
  'anthropic.com',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'bing.com',
  'perplexity.ai',
  'poe.com',
  'pi.ai',
  'meta.ai',
  'grok.com',
  'x.ai',
  'deepseek.com',
  'chat.deepseek.com',
  'you.com',
  'phind.com',
  'blackbox.ai',
  'character.ai',
  'midjourney.com',
  'runwayml.com',
  'leonardo.ai',
  'huggingface.co',
  'cohere.com',
  'jasper.ai',
  'writesonic.com',
  'copy.ai',
  'notion.ai',
  'grammarly.com',
  'quillbot.com',
];

const BLOCKED_URL_FRAGMENT_PATTERNS = [
  '/copilot',
  '/chat',
  '/grok',
  '/gemini',
  '/bard',
  '/deepsearch',
  '/deep-search',
  '/ai-mode',
  'udm=50',
  'ia=chat',
  'model=gpt',
  'model=claude',
  'model=gemini',
  'model=deepseek',
];

const BLOCKED_QUERY_TERMS = [
  'chatgpt',
  'gpt-4',
  'gpt4',
  'claude',
  'gemini',
  'bard',
  'copilot',
  'perplexity',
  'deepseek',
  'grok',
  'poe ai',
  'ai mode',
  'deep research',
  'deep dive ai',
];

const ALLOWED_RESEARCH_DOMAINS = [
  'w3schools.com',
  'geeksforgeeks.org',
];

const AI_SIGNAL_HOST_PATTERNS = [
  ...BLOCKED_DOMAIN_PATTERNS,
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'search.yahoo.com',
  'brave.com',
];

function extractDomainFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isBlockedUrl(url) {
  const domain = extractDomainFromUrl(url);
  if (!domain) return { blocked: false, domain: '' };

  const isAllowedResearchDomain = ALLOWED_RESEARCH_DOMAINS.some((allowed) =>
    domain === allowed || domain.endsWith(`.${allowed}`),
  );
  if (isAllowedResearchDomain) return { blocked: false, domain };

  const blockedDomain = BLOCKED_DOMAIN_PATTERNS.some((pattern) =>
    domain === pattern || domain.endsWith(`.${pattern}`),
  );
  if (blockedDomain) return { blocked: true, domain };

  const shouldCheckAiSignals = AI_SIGNAL_HOST_PATTERNS.some((host) =>
    domain === host || domain.endsWith(`.${host}`),
  );
  if (!shouldCheckAiSignals) return { blocked: false, domain };

  const normalizedUrl = String(url || '').toLowerCase();
  const blockedByFragment = BLOCKED_URL_FRAGMENT_PATTERNS.some((fragment) => normalizedUrl.includes(fragment));
  if (blockedByFragment) return { blocked: true, domain };

  try {
    const parsed = new URL(url);
    const queryText = decodeURIComponent(parsed.search || '').toLowerCase();
    const blockedByQuery = BLOCKED_QUERY_TERMS.some((term) => queryText.includes(term));
    if (blockedByQuery) return { blocked: true, domain };
  } catch {
    // ignore URL parsing failures and rely on domain/fragment checks
  }

  return { blocked: false, domain };
}

function getBrowserViewState() {
  if (!assignmentBrowserView || assignmentBrowserView.webContents.isDestroyed()) {
    return {
      url: '',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
    };
  }

  const wc = assignmentBrowserView.webContents;
  return {
    url: wc.getURL() || '',
    canGoBack: wc.canGoBack(),
    canGoForward: wc.canGoForward(),
    isLoading: wc.isLoading(),
  };
}

function emitBrowserViewState() {
  sendToRenderer('hf/browserView:state', getBrowserViewState());
}

function destroyAssignmentBrowserView() {
  try {
    if (!assignmentBrowserView) return;

    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setBrowserView(null);
      } catch {
        // ignore
      }
    }

    try {
      assignmentBrowserView.webContents.closeDevTools();
    } catch {
      // ignore
    }

    try {
      assignmentBrowserView.webContents.destroy();
    } catch {
      // ignore
    }
  } finally {
    assignmentBrowserView = null;
    browserViewBounds = { x: 0, y: 0, width: 0, height: 0 };
    browserViewHidden = false;
  }
}

function ensureAssignmentBrowserView() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }

  if (assignmentBrowserView && !assignmentBrowserView.webContents.isDestroyed()) {
    return assignmentBrowserView;
  }

  assignmentBrowserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setBrowserView(assignmentBrowserView);

  const wc = assignmentBrowserView.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    const blocked = isBlockedUrl(url);
    if (blocked.blocked) {
      sendToRenderer('hf/browserView:blocked', {
        url,
        domain: blocked.domain,
        reason: 'blocked_domain',
      });
      return { action: 'deny' };
    }

    sendToRenderer('hf/browserView:newTab', { url });
    return { action: 'deny' };
  });

  wc.on('will-navigate', (_event, url) => {
    const blocked = isBlockedUrl(url);
    if (blocked.blocked) {
      try {
        _event.preventDefault();
      } catch {
        // ignore
      }
      sendToRenderer('hf/browserView:blocked', {
        url,
        domain: blocked.domain,
        reason: 'blocked_domain',
      });
      emitBrowserViewState();
      return;
    }

    emitBrowserViewState();
  });

  wc.on('did-start-loading', emitBrowserViewState);
  wc.on('did-stop-loading', emitBrowserViewState);
  wc.on('did-navigate', emitBrowserViewState);
  wc.on('did-navigate-in-page', emitBrowserViewState);
  wc.on('page-title-updated', emitBrowserViewState);
  wc.on('did-fail-load', emitBrowserViewState);
  wc.on('render-process-gone', emitBrowserViewState);

  assignmentBrowserView.setAutoResize({ width: false, height: false });

  return assignmentBrowserView;
}

function createSplashWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 320,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    show: true,
    backgroundColor: '#0b1020',
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  } catch {
    // ignore
  }

  // Load a local splash page (packaged with electron/**).
  const splashHtml = path.join(__dirname, 'splash.html');
  win.loadFile(splashHtml).catch(() => {
    // If something goes wrong, still show an empty window.
  });

  return win;
}

function getConfiguredPinHashHex() {
  // Preferred: store a sha256 hex string in the environment.
  const hashHex = process.env.HF_ADMIN_PIN_SHA256;
  if (typeof hashHex === 'string' && hashHex.trim().length > 0) return hashHex.trim().toLowerCase();

  // Dev-friendly fallback: store the plain PIN in env and hash it at runtime.
  const pin = process.env.HF_ADMIN_PIN;
  if (typeof pin === 'string' && pin.trim().length > 0) {
    return crypto.createHash('sha256').update(pin.trim(), 'utf8').digest('hex');
  }

  return null;
}

function verifyAdminPin(pin) {
  const configuredHash = getConfiguredPinHashHex();
  if (!configuredHash) return { ok: true, bypass: true };
  if (typeof pin !== 'string' || pin.trim().length === 0) return { ok: false };
  const providedHash = crypto.createHash('sha256').update(pin.trim(), 'utf8').digest('hex');
  return { ok: providedHash === configuredHash };
}

const windowState = {
  resizable: true,
  minimizable: true,
  maximizable: true,
  fullScreenable: true,
  alwaysOnTop: false,
};

function isLikelyExternalNavigation(targetUrl) {
  try {
    const url = new URL(targetUrl);
    if (url.protocol === 'file:') return false;

    if (isDev) {
      const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
      const dev = new URL(devUrl);
      // Allow same origin as the dev server.
      return url.origin !== dev.origin;
    }

    // In prod, our UI is file://. Any http(s) is external.
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return true;
  }
}

function sendToRenderer(channel, payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  } catch {
    // ignore
  }
}

function applyExamMode(win, enabled) {
  if (!win || win.isDestroyed()) return;

  if (enabled) {
    // Snapshot current window settings so we can restore them.
    windowState.resizable = win.isResizable();
    windowState.minimizable = win.isMinimizable();
    windowState.maximizable = win.isMaximizable();
    windowState.fullScreenable = win.isFullScreenable();
    windowState.alwaysOnTop = win.isAlwaysOnTop();

    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);

    win.setResizable(false);
    win.setMinimizable(false);
    win.setMaximizable(false);
    win.setFullScreenable(true);

    // Kiosk/fullscreen constraints.
    try { win.setKiosk(true); } catch { /* some platforms */ }
    win.setFullScreen(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.focus();
  } else {
    try { win.setKiosk(false); } catch { /* some platforms */ }
    win.setFullScreen(false);
    win.setAlwaysOnTop(windowState.alwaysOnTop);
    win.setVisibleOnAllWorkspaces(false);

    win.setResizable(windowState.resizable);
    win.setMinimizable(windowState.minimizable);
    win.setMaximizable(windowState.maximizable);
    win.setFullScreenable(windowState.fullScreenable);

    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  }
}

function applyAssignmentMode(win, enabled) {
  if (!win || win.isDestroyed()) return;

  if (enabled) {
    // Snapshot current window settings so we can restore them.
    windowState.resizable = win.isResizable();
    windowState.minimizable = win.isMinimizable();
    windowState.maximizable = win.isMaximizable();
    windowState.fullScreenable = win.isFullScreenable();
    windowState.alwaysOnTop = win.isAlwaysOnTop();

    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);

    // Prevent resizing, minimizing, maximizing during assignment
    win.setResizable(false);
    win.setMinimizable(false);
    win.setMaximizable(false);
    win.setFullScreenable(true);

    // Enter full-screen mode (kiosk-like) to prevent desktop switching
    try { win.setKiosk(true); } catch { /* some platforms */ }
    win.setFullScreen(true);
    win.setAlwaysOnTop(true, 'screen-saver');

    // setVisibleOnAllWorkspaces with visibleOnFullScreen helps prevent virtual desktop switching
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.focus();
  } else {
    try { win.setKiosk(false); } catch { /* some platforms */ }
    win.setFullScreen(false);
    win.setAlwaysOnTop(windowState.alwaysOnTop);
    win.setVisibleOnAllWorkspaces(false);

    win.setResizable(windowState.resizable);
    win.setMinimizable(windowState.minimizable);
    win.setMaximizable(windowState.maximizable);
    win.setFullScreenable(windowState.fullScreenable);

    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  }
}

function disableRestrictiveModesForShutdown(source = 'shutdown') {
  if (shutdownCleanupDone) return;
  shutdownCleanupDone = true;

  examModeEnabled = false;
  assignmentModeEnabled = false;
  agentPolicyEnabled = false;

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      applyExamMode(mainWindow, false);
      applyAssignmentMode(mainWindow, false);
    }
  } catch {
    // ignore cleanup errors during shutdown
  }

  try {
    destroyAssignmentBrowserView();
  } catch {
    // ignore cleanup errors during shutdown
  }

  sendToRenderer('hf/examMode:changed', { enabled: false, source });
  sendToRenderer('hf/assignmentMode:changed', { enabled: false, source });
}

/**
 * Security defaults:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - preload only exposes a tiny, explicit API
 */
function createMainWindow() {
  const start = Date.now();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      enableRemoteModule: false,
    },
  });

  // Hide menus by default.
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  // External link handling: never allow new windows inside Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent external navigations away from the app.
  win.webContents.on('will-navigate', (event, url) => {
    if (isLikelyExternalNavigation(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Block common escape shortcuts while in exam or assignment mode.
  win.webContents.on('before-input-event', (event, input) => {
    const inRestrictiveMode = examModeEnabled || assignmentModeEnabled;
    if (!inRestrictiveMode) return;

    const key = (input.key || '').toLowerCase();
    const isWindows = process.platform === 'win32';

    // Block mode escape shortcuts
    const isReload = key === 'f5' || ((input.control || input.meta) && key === 'r');
    const isDevtools = key === 'f12' || ((input.control || input.meta) && input.shift && (key === 'i' || key === 'j' || key === 'c'));
    const isClose = input.alt && key === 'f4';

    // Additional blocks for assignment mode (prevent desktop/task switching)
    let shouldBlock = isReload || isDevtools || isClose;
    if (assignmentModeEnabled && isWindows) {
      // Block Windows key (to prevent desktop switching, virtual desktop, start menu)
      const isWindowsKey = key === 'os' || key === 'meta' || key === 'command';

      // Block Alt+Tab and Alt+Esc (task switcher)
      const isAltTab = input.alt && (key === 'tab' || key === 'escape');

      // Block Ctrl+Alt+Tab (multi-window task switcher)
      const isCtrlAltTab = input.control && input.alt && key === 'tab';

      // Block Ctrl+Alt+Down/Up (virtual desktop switching on Windows)
      const isVirtualDesktopSwitch = input.control && input.alt && (key === 'arrowdown' || key === 'arrowup');

      shouldBlock = shouldBlock || isWindowsKey || isAltTab || isCtrlAltTab || isVirtualDesktopSwitch;
    }

    if (shouldBlock) {
      event.preventDefault();
    }
  });

  // Prevent closing the window while in exam or assignment mode.
  win.on('close', (event) => {
    if (isQuitting) return;

    // Assignment mode is allowed to close; we only block true exam lock mode.
    if (examModeEnabled) {
      event.preventDefault();
      const source = 'exam';
      // Emit both channels for backward compatibility.
      sendToRenderer('hf/lockdownMode:closeBlocked', { enabled: true, source });
      sendToRenderer('hf/examMode:closeBlocked', { enabled: true, source });
    }
  });

  win.webContents.on('did-finish-load', () => {
    if (isDev) return;
    console.log(`[startup] did-finish-load in ${Date.now() - start}ms`);
  });

  // Capture renderer console output into the main log for diagnosing "stuck on splash".
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (isDev) return;
    // level: 0=debug,1=info,2=warn,3=error
    const label = level === 3 ? '[ERROR]' : level === 2 ? '[WARN ]' : '[INFO ]';
    console.log(`${label} [renderer] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (isDev) return;
    console.error('[startup] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    if (isDev) return;
    console.error('[startup] render-process-gone', details);
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the Vite build output.
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }

  win.on('closed', () => {
    if (mainWindow === win) {
      destroyAssignmentBrowserView();
    }
  });

  return win;
}

app.whenReady().then(async () => {
  initFileLogging();

  try {
    const ses = session.defaultSession;
    await ses.clearCache();
    await ses.clearStorageData({
      storages: ['appcache', 'serviceworkers', 'cachestorage', 'indexdb', 'localstorage', 'shadercache'],
    });
    console.log('[startup] cleared defaultSession cache/storage');
  } catch (e) {
    console.warn('[startup] failed to clear defaultSession cache/storage', safeToString(e));
  }

  // Single instance lock (prevents multiple copies during exam mode).
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Slight hardening: deny all permission prompts by default.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });

  // Emergency exit: Ctrl+Shift+E disables exam mode.
  // NOTE: This is intentionally present to avoid trapping users.
  globalShortcut.register('Control+Shift+E', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    examModeEnabled = false;
    applyExamMode(mainWindow, false);
    sendToRenderer('hf/examMode:changed', { enabled: false, source: 'hotkey' });
  });

  // IPC API used by preload/renderer.
  ipcMain.handle('hf/examMode:get', () => ({ enabled: examModeEnabled }));
  ipcMain.handle('hf/examMode:set', (_event, payload) => {
    const enabled = !!(payload && payload.enabled);
    // Allow enabling without PIN.
    if (enabled) {
      examModeEnabled = true;
      if (mainWindow && !mainWindow.isDestroyed()) applyExamMode(mainWindow, true);
      sendToRenderer('hf/examMode:changed', { enabled: true, source: 'renderer' });
      return { enabled: true };
    }

    // Disabling requires PIN if configured.
    if (examModeEnabled) {
      const configuredHash = getConfiguredPinHashHex();
      if (configuredHash) {
        return { enabled: true, requiresPin: true };
      }
    }

    examModeEnabled = false;
    if (mainWindow && !mainWindow.isDestroyed()) applyExamMode(mainWindow, false);
    sendToRenderer('hf/examMode:changed', { enabled: false, source: 'renderer' });
    return { enabled: false };
  });

  ipcMain.handle('hf/examMode:unlock', (_event, payload) => {
    const pin = payload?.pin;
    const res = verifyAdminPin(pin);
    if (!res.ok) {
      return { ok: false, enabled: examModeEnabled };
    }

    examModeEnabled = false;
    if (mainWindow && !mainWindow.isDestroyed()) applyExamMode(mainWindow, false);
    sendToRenderer('hf/examMode:changed', { enabled: false, source: res.bypass ? 'unlock-bypass' : 'unlock-pin' });
    return { ok: true, enabled: false, bypass: !!res.bypass };
  });

  // Assignment Mode IPC handlers
  ipcMain.handle('hf/assignmentMode:get', () => ({ enabled: assignmentModeEnabled }));

  ipcMain.handle('hf/assignmentMode:set', (_event, payload) => {
    const enabled = !!(payload && payload.enabled);

    if (enabled) {
      assignmentModeEnabled = true;
      if (mainWindow && !mainWindow.isDestroyed()) applyAssignmentMode(mainWindow, true);
      sendToRenderer('hf/assignmentMode:changed', { enabled: true, source: 'renderer' });
      return { enabled: true };
    }

    assignmentModeEnabled = false;
    if (mainWindow && !mainWindow.isDestroyed()) applyAssignmentMode(mainWindow, false);
    sendToRenderer('hf/assignmentMode:changed', { enabled: false, source: 'renderer' });
    return { enabled: false };
  });

  ipcMain.handle('hf/agent:policyEnabled:get', () => ({ enabled: agentPolicyEnabled }));
  ipcMain.handle('hf/agent:policyEnabled:set', (_event, payload) => {
    agentPolicyEnabled = !!payload?.enabled;
    return { enabled: agentPolicyEnabled };
  });

  ipcMain.handle('hf/logs:getInfo', () => {
    const logsDir = getLogsDir();
    return {
      ok: true,
      userData: app.getPath('userData'),
      logsDir,
      logFilePath,
    };
  });

  ipcMain.handle('hf/logs:open', async () => {
    try {
      const logsDir = getLogsDir();
      if (!logsDir) return { ok: false, error: 'Unable to resolve logs directory' };
      fs.mkdirSync(logsDir, { recursive: true });

      // Prefer opening the folder, not the file, so users can compare multiple runs.
      const res = await shell.openPath(logsDir);
      if (typeof res === 'string' && res.trim().length > 0) {
        return { ok: false, error: res, logsDir };
      }
      return { ok: true, logsDir };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  // ── Agent IPC via Named Pipe ──────────────────────────────
  ipcMain.handle('hf/agent:command', async (_event, payload) => {
    const command = String(payload?.command || '').toLowerCase();
    const allowedWithoutPolicy = command === 'status' || command === 'ping';
    if (!agentPolicyEnabled && !allowedWithoutPolicy) {
      return {
        ok: false,
        error: 'Agent command blocked because no active policy has enabled agent enforcement.',
      };
    }

    const net = require('net');
    const PIPE_PATH = '\\\\.\\pipe\\ControlPlaneAgentPipe';

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ ok: false, error: 'Agent connection timed out. Is the ControlPlane.Agent service running?' });
      }, 5000);

      try {
        const client = net.createConnection(PIPE_PATH, () => {
          const msg = JSON.stringify({
            command: payload?.command ?? 'ping',
            payload: payload?.payload ?? null,
            requestId: `electron-${Date.now()}`,
          });
          client.write(msg + '\n');
        });

        let data = '';
        client.on('data', (chunk) => {
          data += chunk.toString();
          // Strip UTF-8 BOM if present
          if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
          // Responses are newline-delimited JSON
          const lines = data.split('\n');
          if (lines.length > 1) {
            clearTimeout(timeout);
            try {
              const response = JSON.parse(lines[0]);
              resolve({ ok: true, ...response });
            } catch {
              resolve({ ok: false, error: 'Invalid response from agent', raw: lines[0] });
            }
            client.end();
          }
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          resolve({ ok: false, error: `Agent pipe error: ${err.message}. Is the ControlPlane.Agent service running?` });
        });
      } catch (e) {
        clearTimeout(timeout);
        resolve({ ok: false, error: safeToString(e) });
      }
    });
  });

  // ── Agent Risk Alert Forwarding ─────────────────────────
  // Forwards AI-risk events from the agent to the renderer
  // so the UI can show integrity reminder modals in real time.
  ipcMain.handle('hf/risk:forward', (_event, payload) => {
    sendToRenderer('hf/risk:alert', payload);
    return { ok: true };
  });

  // ── Embedded BrowserView API ───────────────────────────
  ipcMain.handle('hf/browserView:create', async (_event, payload) => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };

      const url = String(payload?.url || '').trim();
      if (url) {
        await view.webContents.loadURL(url);
      }

      if (browserViewBounds.width > 0 && browserViewBounds.height > 0) {
        view.setBounds(browserViewBounds);
      }

      emitBrowserViewState();
      return { ok: true, state: getBrowserViewState() };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:setBounds', (_event, payload) => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };

      const rawX = Number(payload?.x) || 0;
      const rawY = Number(payload?.y) || 0;
      const rawWidth = Math.max(1, Number(payload?.width) || 1);
      const rawHeight = Math.max(1, Number(payload?.height) || 1);
      const viewportWidth = Math.max(1, Number(payload?.viewportWidth) || 1);
      const viewportHeight = Math.max(1, Number(payload?.viewportHeight) || 1);

      const content = mainWindow.getContentBounds();
      const scaleX = content.width / viewportWidth;
      const scaleY = content.height / viewportHeight;

      let x = Math.floor(rawX * scaleX);
      let y = Math.floor(rawY * scaleY);
      let width = Math.max(1, Math.floor(rawWidth * scaleX));
      let height = Math.max(1, Math.floor(rawHeight * scaleY));

      // Clamp to window content bounds so BrowserView can never escape pane/window.
      x = Math.max(0, Math.min(x, content.width - 1));
      y = Math.max(0, Math.min(y, content.height - 1));
      width = Math.max(1, Math.min(width, content.width - x));
      height = Math.max(1, Math.min(height, content.height - y));

      browserViewBounds = { x, y, width, height };
      if (!browserViewHidden) {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserView?.() !== view) {
          mainWindow.setBrowserView(view);
        }
        view.setBounds(browserViewBounds);
      }
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:setHidden', (_event, payload) => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };

      browserViewHidden = !!payload?.hidden;
      if (browserViewHidden) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setBrowserView(null);
        }
      } else if (browserViewBounds.width > 0 && browserViewBounds.height > 0) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setBrowserView(view);
        }
        view.setBounds(browserViewBounds);
      }
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:navigate', async (_event, payload) => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };

      const url = String(payload?.url || '').trim();
      if (!url) return { ok: false, error: 'URL is required' };

      const blocked = isBlockedUrl(url);
      if (blocked.blocked) {
        sendToRenderer('hf/browserView:blocked', {
          url,
          domain: blocked.domain,
          reason: 'blocked_domain',
        });
        emitBrowserViewState();
        return { ok: false, error: 'Blocked URL', blocked: true, domain: blocked.domain };
      }

      await view.webContents.loadURL(url);
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:back', () => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };
      if (view.webContents.canGoBack()) view.webContents.goBack();
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:forward', () => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };
      if (view.webContents.canGoForward()) view.webContents.goForward();
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:reload', () => {
    try {
      const view = ensureAssignmentBrowserView();
      if (!view) return { ok: false, error: 'Main window is not available' };
      view.webContents.reload();
      emitBrowserViewState();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/browserView:destroy', () => {
    try {
      destroyAssignmentBrowserView();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: safeToString(e) };
    }
  });

  ipcMain.handle('hf/fileDialog:openFile', async (_event, options) => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow || null, {
        title: String(options?.title ?? 'Select File'),
        properties: Array.isArray(options?.properties) ? options.properties : ['openFile'],
        filters: Array.isArray(options?.filters) ? options.filters : [{ name: 'All Files', extensions: ['*'] }],
      });
      return {
        cancelled: result.canceled,
        filePaths: result.filePaths || [],
      };
    } catch (e) {
      return { cancelled: true, filePaths: [], error: safeToString(e) };
    }
  });

  // Show a fast splash so the app feels responsive on cold start.
  // (Windows AV + first-run disk cache can make renderer boot feel slow.)
  splashWindow = createSplashWindow();

  mainWindow = createMainWindow();

  const swapFromSplash = () => {
    try {
      if (splashWindow && !splashWindow.isDestroyed()) {
        // Some Windows configurations can keep a frameless always-on-top window around.
        // Destroy ensures it can't cover the main window.
        try { splashWindow.setAlwaysOnTop(false); } catch { /* ignore */ }
        splashWindow.destroy();
      }
    } catch {
      // ignore
    }
    splashWindow = null;

    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    } catch {
      // ignore
    }
  };

  // Prefer ready-to-show for a clean transition.
  mainWindow.once('ready-to-show', swapFromSplash);

  // If the main window fails to load, still show it so the user sees something (even an error page).
  mainWindow.webContents.once('did-fail-load', swapFromSplash);

  // Safety: if ready-to-show takes too long, show the window anyway.
  setTimeout(swapFromSplash, 4000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });

  app.on('query-session-end', () => {
    isQuitting = true;
    disableRestrictiveModesForShutdown('query-session-end');
  });

  app.on('session-end', () => {
    isQuitting = true;
    disableRestrictiveModesForShutdown('session-end');
  });

  powerMonitor.on('shutdown', () => {
    isQuitting = true;
    disableRestrictiveModesForShutdown('power-shutdown');
  });
});

app.on('window-all-closed', () => {
  isQuitting = true;
  disableRestrictiveModesForShutdown('window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  isQuitting = true;
  disableRestrictiveModesForShutdown('will-quit');
  globalShortcut.unregisterAll();
});
