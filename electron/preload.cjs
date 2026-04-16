const { contextBridge, ipcRenderer } = require('electron');

// Expose a tiny API surface to the renderer.
contextBridge.exposeInMainWorld('humanfirstDesktop', {
  isDesktop: true,
  version: process.versions.electron,
  platform: process.platform,

  getExamMode: async () => {
    const res = await ipcRenderer.invoke('hf/examMode:get');
    return !!res?.enabled;
  },
  setExamMode: async (enabled) => {
    const res = await ipcRenderer.invoke('hf/examMode:set', { enabled: !!enabled });
    return !!res?.enabled;
  },

  unlockExamMode: async (pin) => {
    const res = await ipcRenderer.invoke('hf/examMode:unlock', { pin: String(pin ?? '') });
    return { ok: !!res?.ok, enabled: !!res?.enabled, bypass: !!res?.bypass };
  },

  getAssignmentMode: async () => {
    const res = await ipcRenderer.invoke('hf/assignmentMode:get');
    return !!res?.enabled;
  },
  setAssignmentMode: async (enabled) => {
    const res = await ipcRenderer.invoke('hf/assignmentMode:set', { enabled: !!enabled });
    return !!res?.enabled;
  },

  getLogsInfo: async () => {
    const res = await ipcRenderer.invoke('hf/logs:getInfo');
    return {
      ok: !!res?.ok,
      userData: String(res?.userData ?? ''),
      logsDir: String(res?.logsDir ?? ''),
      logFilePath: String(res?.logFilePath ?? ''),
    };
  },

  openLogsFolder: async () => {
    const res = await ipcRenderer.invoke('hf/logs:open');
    return { ok: !!res?.ok, logsDir: String(res?.logsDir ?? ''), error: String(res?.error ?? '') };
  },

  // Agent IPC � send commands to the ControlPlane.Agent via named pipe
  agentStatus: async () => {
    const res = await ipcRenderer.invoke('hf/agent:command', { command: 'status' });
    return res;
  },

  agentPushPolicies: async (policies) => {
    const res = await ipcRenderer.invoke('hf/agent:command', {
      command: 'push_policies',
      payload: JSON.stringify({ policies }),
    });
    return res;
  },

  agentReload: async () => {
    const res = await ipcRenderer.invoke('hf/agent:command', { command: 'reload' });
    return res;
  },

  getAgentPolicyEnabled: async () => {
    const res = await ipcRenderer.invoke('hf/agent:policyEnabled:get');
    return !!res?.enabled;
  },

  setAgentPolicyEnabled: async (enabled) => {
    const res = await ipcRenderer.invoke('hf/agent:policyEnabled:set', { enabled: !!enabled });
    return !!res?.enabled;
  },

  browserViewCreate: async (url) => {
    const res = await ipcRenderer.invoke('hf/browserView:create', { url: String(url ?? '') });
    return { ok: !!res?.ok, state: res?.state ?? null, error: String(res?.error ?? '') };
  },

  browserViewDestroy: async () => {
    const res = await ipcRenderer.invoke('hf/browserView:destroy');
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewSetBounds: async (bounds) => {
    const res = await ipcRenderer.invoke('hf/browserView:setBounds', bounds ?? {});
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewSetHidden: async (hidden) => {
    const res = await ipcRenderer.invoke('hf/browserView:setHidden', { hidden: !!hidden });
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewNavigate: async (url) => {
    const res = await ipcRenderer.invoke('hf/browserView:navigate', { url: String(url ?? '') });
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewBack: async () => {
    const res = await ipcRenderer.invoke('hf/browserView:back');
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewForward: async () => {
    const res = await ipcRenderer.invoke('hf/browserView:forward');
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  browserViewReload: async () => {
    const res = await ipcRenderer.invoke('hf/browserView:reload');
    return { ok: !!res?.ok, error: String(res?.error ?? '') };
  },

  fileDialog: {
    openFile: async (options) => {
      const res = await ipcRenderer.invoke('hf/fileDialog:openFile', options ?? {});
      return {
        cancelled: !!res?.cancelled,
        filePaths: Array.isArray(res?.filePaths) ? res.filePaths : [],
      };
    },
    openFolder: async (options) => {
      const res = await ipcRenderer.invoke('hf/fileDialog:openFolder', options ?? {});
      return {
        cancelled: !!res?.cancelled,
        filePaths: Array.isArray(res?.filePaths) ? res.filePaths : [],
      };
    },
  },

  getSessionFolder: async () => {
    const res = await ipcRenderer.invoke('hf/sessionFolder:get');
    return {
      locked: !!res?.locked,
      path: String(res?.path ?? ''),
    };
  },

  setSessionFolder: async (folderPath) => {
    const res = await ipcRenderer.invoke('hf/sessionFolder:set', { path: String(folderPath ?? '') });
    return {
      ok: !!res?.ok,
      locked: !!res?.locked,
      path: String(res?.path ?? ''),
      error: String(res?.error ?? ''),
    };
  },

  saveAssignmentDraft: async (payload) => {
    const res = await ipcRenderer.invoke('hf/assignment:draftSave', payload ?? {});
    return {
      ok: !!res?.ok,
      filePath: String(res?.filePath ?? ''),
      savedAt: String(res?.savedAt ?? ''),
      error: String(res?.error ?? ''),
    };
  },

  exportAssignmentPdf: async (payload) => {
    const res = await ipcRenderer.invoke('hf/assignment:exportPdf', payload ?? {});
    return {
      ok: !!res?.ok,
      filePath: String(res?.filePath ?? ''),
      fileName: String(res?.fileName ?? ''),
      fileSizeKb: Number(res?.fileSizeKb ?? 0),
      metadata: res?.metadata ?? null,
      error: String(res?.error ?? ''),
    };
  },

  setSubmissionLock: async (submissionUrl) => {
    const res = await ipcRenderer.invoke('hf/submissionLock:set', { submissionUrl: String(submissionUrl ?? '') });
    return {
      ok: !!res?.ok,
      domain: String(res?.domain ?? ''),
      error: String(res?.error ?? ''),
    };
  },

  clearSubmissionLock: async () => {
    const res = await ipcRenderer.invoke('hf/submissionLock:clear');
    return { ok: !!res?.ok };
  },

  quitAfterDelay: async (delayMs) => {
    const res = await ipcRenderer.invoke('hf/app:quitAfterDelay', { delayMs: Number(delayMs ?? 0) });
    return {
      ok: !!res?.ok,
      delayMs: Number(res?.delayMs ?? 0),
      error: String(res?.error ?? ''),
    };
  },

  onBrowserViewState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/browserView:state', handler);
    return () => ipcRenderer.removeListener('hf/browserView:state', handler);
  },

  onBrowserViewBlocked: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/browserView:blocked', handler);
    return () => ipcRenderer.removeListener('hf/browserView:blocked', handler);
  },

  onBrowserViewNewTab: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/browserView:newTab', handler);
    return () => ipcRenderer.removeListener('hf/browserView:newTab', handler);
  },

  onExamModeChanged: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/examMode:changed', handler);
    return () => ipcRenderer.removeListener('hf/examMode:changed', handler);
  },

  onCloseBlocked: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/examMode:closeBlocked', handler);
    return () => ipcRenderer.removeListener('hf/examMode:closeBlocked', handler);
  },

  // Risk alert events forwarded from the agent (e.g. AI domain visited)
  onRiskAlert: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('hf/risk:alert', handler);
    return () => ipcRenderer.removeListener('hf/risk:alert', handler);
  },
});
