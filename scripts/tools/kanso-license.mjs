#!/usr/bin/env node
// Kanso Cre8 licence tool (owner only). Uses Node's built-in Ed25519.
//
//   node scripts/tools/kanso-license.mjs keygen <folder outside the repo>
//   node scripts/tools/kanso-license.mjs issue --key <private.pem> --licensee "Acme Corp" [--email a@example.com] [--id ORDER-1]
//   node scripts/tools/kanso-license.mjs verify --pub <public-key-hex> <licence key>
//
// Key format: KANSO1-<base64url(payload JSON)>.<base64url(Ed25519 signature of the payload bytes)>
// Payload: { v: 1, id, licensee, email?, tier: "pro", issued: "YYYY-MM-DD" }
// The private key must never be committed. The app embeds only the public key
// (src-tauri/src/license.rs, PUBLIC_KEY).

import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PREFIX = 'KANSO1-';
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const fromB64url = (s) => Buffer.from(s, 'base64url');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

/** Raw 32-byte public key from a KeyObject (the last 32 bytes of its SPKI DER). */
const rawPublic = (key) => key.export({ format: 'der', type: 'spki' }).subarray(-32);

function keygen(dir) {
  if (!dir) throw new Error('Give a folder outside the repo, for example %USERPROFILE%\\.kanso-licensing');
  const out = resolve(dir);
  if (existsSync(join(process.cwd(), '.git')) && out.startsWith(resolve(process.cwd()))) {
    throw new Error('Refusing to write the private key inside the repository.');
  }
  const priv = join(out, 'kanso-license-private.pem');
  if (existsSync(priv)) throw new Error(`${priv} already exists; not overwriting it.`);
  mkdirSync(out, { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(priv, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  const hex = rawPublic(publicKey).toString('hex');
  writeFileSync(join(out, 'kanso-license-public.hex'), `${hex}\n`);
  console.log(`Private key: ${priv} (back it up; never commit it)`);
  console.log(`Public key (hex, goes into license.rs): ${hex}`);
}

function issue() {
  const keyPath = arg('key');
  const licensee = arg('licensee');
  if (!keyPath || !licensee) throw new Error('issue needs --key <private.pem> and --licensee "<name>"');
  const payload = { v: 1, id: arg('id', randomUUID()), licensee, tier: 'pro', issued: arg('issued', new Date().toISOString().slice(0, 10)) };
  const email = arg('email');
  if (email) payload.email = email;
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = sign(null, bytes, createPrivateKey(readFileSync(keyPath)));
  console.log(`${PREFIX}${b64url(bytes)}.${b64url(signature)}`);
}

function check() {
  const pubHex = arg('pub');
  const key = process.argv[process.argv.length - 1];
  const [body, sig] = key.slice(PREFIX.length).split('.');
  const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pubHex, 'hex')]);
  const pub = createPublicKey({ key: der, format: 'der', type: 'spki' });
  const ok = key.startsWith(PREFIX) && verify(null, fromB64url(body), pub, fromB64url(sig));
  console.log(ok ? `valid: ${fromB64url(body).toString('utf8')}` : 'INVALID');
  process.exit(ok ? 0 : 1);
}

try {
  const cmd = process.argv[2];
  if (cmd === 'keygen') keygen(process.argv[3]);
  else if (cmd === 'issue') issue();
  else if (cmd === 'verify') check();
  else console.log('Usage: keygen <dir> | issue --key <pem> --licensee <name> [--email e] [--id i] | verify --pub <hex> <key>');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
