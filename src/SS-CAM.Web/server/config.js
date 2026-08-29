const path = require('path');
const fs = require('fs');

const envWorkspace = process.env.WORKSPACE_ROOT;
const uncNasPath = '\\\\SSNAS\\Creative-Team';
const localSyncCandidates = [
  'D:\\SynologyDrive\\Creative-Team',
  'C:\\SynologyDrive\\Creative-Team',
  'E:\\SynologyDrive\\Creative-Team',
  path.join(process.env.USERPROFILE || '', 'SynologyDrive', 'Creative-Team'),
  path.join(process.env.USERPROFILE || '', 'Synology Drive', 'Creative-Team')
];
const linuxNasPath = '/volume1/Creative-Team';
const linuxNasVolume2Path = '/volume2/Creative-Team';
const fallbackLocalWorkspace = path.resolve(__dirname, '../sample-workspace');

function isPathAccessible(dirPath) {
  try {
    if (!dirPath) return false;
    fs.readdirSync(dirPath);
    return true;
  } catch (e) {
    return false;
  }
}

const overrideConfigPath = path.resolve(__dirname, 'workspace_config.json');
let userOverridePath = null;
if (fs.existsSync(overrideConfigPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(overrideConfigPath, 'utf8'));
    if (raw && raw.workspaceRoot && isPathAccessible(raw.workspaceRoot)) {
      userOverridePath = raw.workspaceRoot;
    }
  } catch (e) {}
}

let resolvedWorkspace = fallbackLocalWorkspace;

if (userOverridePath) {
  resolvedWorkspace = userOverridePath;
} else if (envWorkspace && isPathAccessible(envWorkspace)) {
  resolvedWorkspace = envWorkspace;
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

module.exports = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || 'ss-cam-creative-secret-key-2026-mgmt-portal',
  WORKSPACE_ROOT: resolvedWorkspace,
  DEFAULT_NAS_PATH: process.platform === 'win32' ? uncNasPath : linuxNasPath,
  FALLBACK_LOCAL_WORKSPACE: fallbackLocalWorkspace,
  APP_TITLE: 'SuamiSihat Creative Team Portal',
  VERSION: '4.5.1'
};
