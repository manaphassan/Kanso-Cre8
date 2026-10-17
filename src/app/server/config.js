const path = require('path');
const fs = require('fs');

const envWorkspace = process.env.WORKSPACE_ROOT;
const uncNasPath = '';
const localSyncCandidates = [];
const linuxNasPath = '';
const linuxNasVolume2Path = '';
function isPathAccessible(dirPath) {
  try {
    if (!dirPath) return false;
    fs.readdirSync(dirPath);
    return true;
  } catch (e) {
    return false;
  }
}

const crypto = require('crypto');

function getMachineConfigPath() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
    return path.join(appData, 'KansoCre8', 'app.json');
  } else {
    const configHome = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config');
    return path.join(configHome, 'kansocre8', 'app.json');
  }
}

function loadMachineConfig() {
  const p = getMachineConfigPath();
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveMachineConfig(cfg) {
  const p = getMachineConfigPath();
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 });
    try {
      fs.chmodSync(p, 0o600);
    } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

let machineCfg = loadMachineConfig();

// Migration: server/workspace_config.json -> Machine tier
const legacyWorkspaceConfig = path.resolve(__dirname, 'workspace_config.json');
if (fs.existsSync(legacyWorkspaceConfig)) {
  try {
    const raw = JSON.parse(fs.readFileSync(legacyWorkspaceConfig, 'utf8'));
    if (raw && raw.workspaceRoot) {
      machineCfg.workspaceRoot = raw.workspaceRoot;
      saveMachineConfig(machineCfg);
    }
    fs.unlinkSync(legacyWorkspaceConfig);
  } catch (e) {}
}

// Migration: server/ai-config.json -> Machine tier
const legacyAiConfig = path.resolve(__dirname, 'ai-config.json');
if (fs.existsSync(legacyAiConfig)) {
  try {
    const raw = JSON.parse(fs.readFileSync(legacyAiConfig, 'utf8'));
    if (raw && (raw.apiKey || raw.preferredModel)) {
      if (raw.apiKey) machineCfg.aiApiKey = raw.apiKey;
      if (raw.preferredModel) machineCfg.aiModel = raw.preferredModel;
      saveMachineConfig(machineCfg);
    }
    fs.unlinkSync(legacyAiConfig);
  } catch (e) {}
}

const sampleCandidates = [
  path.resolve(__dirname, 'sample-workspace'),
  path.resolve(__dirname, '../sample-workspace'),
  path.resolve(process.cwd(), 'sample-workspace')
];
const fallbackLocalWorkspace = sampleCandidates.find(p => isPathAccessible(p)) || path.resolve(__dirname, '../sample-workspace');

let userOverridePath = null;
if (machineCfg && machineCfg.workspaceRoot && isPathAccessible(machineCfg.workspaceRoot)) {
  userOverridePath = machineCfg.workspaceRoot;
}

let resolvedWorkspace = fallbackLocalWorkspace;

const defaultWindowsDocumentsVault = path.join(process.env.USERPROFILE || '', 'Documents', 'KansoCre8');
const oneDriveWindowsDocumentsVault = path.join(process.env.USERPROFILE || '', 'OneDrive', 'Documents', 'KansoCre8');

if (userOverridePath) {
  resolvedWorkspace = userOverridePath;
} else if (envWorkspace && isPathAccessible(envWorkspace)) {
  resolvedWorkspace = envWorkspace;
} else if (process.platform === 'win32' && isPathAccessible(defaultWindowsDocumentsVault)) {
  resolvedWorkspace = defaultWindowsDocumentsVault;
} else if (process.platform === 'win32' && isPathAccessible(oneDriveWindowsDocumentsVault)) {
  resolvedWorkspace = oneDriveWindowsDocumentsVault;
} else if (process.platform === 'win32' && isPathAccessible(uncNasPath)) {
  resolvedWorkspace = uncNasPath;
} else if (process.platform === 'win32') {
  const foundLocal = localSyncCandidates.find(p => isPathAccessible(p));
  if (foundLocal) {
    resolvedWorkspace = foundLocal;
  } else if (isPathAccessible(fallbackLocalWorkspace)) {
    resolvedWorkspace = fallbackLocalWorkspace;
  }
} else if (isPathAccessible(linuxNasPath)) {
  resolvedWorkspace = linuxNasPath;
} else if (isPathAccessible(linuxNasVolume2Path)) {
  resolvedWorkspace = linuxNasVolume2Path;
} else {
  resolvedWorkspace = fallbackLocalWorkspace;
}

let resolvedSecret = process.env.JWT_SECRET;

if (!resolvedSecret) {
  if (machineCfg && machineCfg.serverSecret) {
    resolvedSecret = machineCfg.serverSecret;
  } else {
    resolvedSecret = crypto.randomBytes(32).toString('hex');
    machineCfg.serverSecret = resolvedSecret;
    saveMachineConfig(machineCfg);
  }
}

if (!resolvedSecret && process.env.NODE_ENV === 'production') {
  throw new Error('[Security Error] Missing server secret in production environment.');
}

module.exports = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || '127.0.0.1',
  JWT_SECRET: resolvedSecret,
  WORKSPACE_ROOT: resolvedWorkspace,
  DEFAULT_NAS_PATH: process.platform === 'win32' ? uncNasPath : linuxNasPath,
  FALLBACK_LOCAL_WORKSPACE: fallbackLocalWorkspace,
  APP_TITLE: 'Kanso Cre8 - The Mindful Creative Vault',
  VERSION: '0.7.0',
  getMachineConfigPath,
  loadMachineConfig,
  saveMachineConfig
};
