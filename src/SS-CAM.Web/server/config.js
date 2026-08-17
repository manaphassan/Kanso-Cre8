const path = require('path');
const fs = require('fs');

const envWorkspace = process.env.WORKSPACE_ROOT;
const uncNasPath = '\\\\SSNAS\\Creative-Team';
const localSyncPath = 'E:\\SynologyDrive\\Creative-Team';
const linuxNasPath = '/volume1/Creative-Team';
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

let resolvedWorkspace = fallbackLocalWorkspace;

if (envWorkspace && isPathAccessible(envWorkspace)) {
  resolvedWorkspace = envWorkspace;
} else if (process.platform === 'win32' && isPathAccessible(uncNasPath)) {
  resolvedWorkspace = uncNasPath;
} else if (process.platform === 'win32' && isPathAccessible(localSyncPath)) {
  resolvedWorkspace = localSyncPath;
} else if (isPathAccessible(linuxNasPath)) {
  resolvedWorkspace = linuxNasPath;
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
  VERSION: '3.6.1'
};
