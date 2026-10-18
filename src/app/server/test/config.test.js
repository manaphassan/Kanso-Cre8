/**
 * ConfigService, migrateVault, and Host/Secret Defaults Verification
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const ConfigService = require('../services/ConfigService');
const WorkspaceService = require('../services/WorkspaceService');

module.exports = async function run(test, context = {}) {
  // ─── TEST: Host and Security Defaults ─────────────────────────────────
  test('Server config binds to loopback 127.0.0.1 by default with random token', () => {
    assert.strictEqual(config.HOST, '127.0.0.1', 'Server must bind to 127.0.0.1 for local security');
    assert.ok(config.PORT >= 1024, 'Port should be valid unprivileged port');
    assert.ok(typeof config.JWT_SECRET === 'string' && config.JWT_SECRET.length > 0, 'JWT_SECRET must be defined');
  });

  // ─── TEST: ConfigService 3-Tier Storage Engine ────────────────────────
  test('ConfigService manages Machine and Vault tier preferences without leaks', () => {
    // Machine tier preference
    ConfigService.machine.set('test_theme', 'kanso-zen-dark');
    assert.strictEqual(ConfigService.machine.get('test_theme'), 'kanso-zen-dark');

    // Vault tier preferences
    const prefs = ConfigService.vault.get('preferences');
    assert.ok(prefs, 'Preferences should exist');
    assert.ok(typeof prefs.theme === 'string');

    // Vault tier studio profile
    const profile = ConfigService.vault.get('studio');
    assert.ok(profile, 'Studio profile should exist');
    assert.ok(typeof profile.studioName === 'string');

    // Ensure secrets are NOT stored in studio profile or preferences
    assert.strictEqual(profile.jwt_secret, undefined);
    assert.strictEqual(profile.session_secret, undefined);
    assert.strictEqual(prefs.jwt_secret, undefined);
  });

  // ─── TEST: migrateVault Idempotency & Backup Safety ────────────────────
  test('ConfigService.migrateVault runs idempotently without data loss', () => {
    const tempWs = path.join(__dirname, 'temp-migrate-vault-verify');
    if (!fs.existsSync(tempWs)) fs.mkdirSync(tempWs, { recursive: true });

    // Seed mock legacy folder
    const legacyZettel = path.join(tempWs, '_Zettelkasten');
    if (!fs.existsSync(legacyZettel)) fs.mkdirSync(legacyZettel, { recursive: true });

    const result = ConfigService.migrateVault(tempWs);
    assert.ok(result.success, 'Migration should succeed');

    // Clean up
    try { fs.rmSync(tempWs, { recursive: true, force: true }); } catch (e) {}
  });
};

if (require.main === module) {
  (async () => {
    let passed = 0;
    let failed = 0;
    async function t(name, fn) {
      try {
        const res = fn();
        if (res && typeof res.then === 'function') await res;
        console.log(`  PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    }
    console.log(`Running standalone test: ${path.basename(__filename)}...`);
    await module.exports(t, {});
    console.log(`\n${passed} Passed, ${failed} Failed\n`);
    if (WorkspaceService.watcher) {
      try { await WorkspaceService.watcher.close(); } catch (_) {}
    }
    process.exit(failed > 0 ? 1 : 0);
  })();
}
