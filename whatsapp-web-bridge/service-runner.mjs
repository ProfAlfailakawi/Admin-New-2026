import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const bridgeDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(bridgeDir);

const logsDir = path.join(bridgeDir, 'logs');
const stdoutLog = path.join(logsDir, 'bridge.log');
const stderrLog = path.join(logsDir, 'bridge-error.log');
const serviceLog = path.join(logsDir, 'service.log');
const maxBytes = clampNumber(process.env.WHATSAPP_LOG_MAX_BYTES, 512 * 1024, 50 * 1024 * 1024, 5 * 1024 * 1024);
const keepFiles = clampNumber(process.env.WHATSAPP_LOG_KEEP_FILES, 1, 20, 5);
const baseUrl = String(process.env.ALTURATH_BRIDGE_BASE_URL || '').trim().replace(/\/$/, '');
const secret = String(process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

let stopping = false;
let child = null;

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(text) {
  let output = String(text || '');
  if (secret) output = output.split(secret).join('[redacted-secret]');
  return output;
}

function rotateLog(file) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (size < maxBytes) return;
    for (let i = keepFiles - 1; i >= 1; i -= 1) {
      const from = `${file}.${i}`;
      const to = `${file}.${i + 1}`;
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    if (fs.existsSync(file)) fs.renameSync(file, `${file}.1`);
  } catch (error) {
    process.stderr.write(`log rotation failed: ${error?.message || error}\n`);
  }
}

function appendLog(file, chunk) {
  try {
    const clean = redact(chunk);
    const currentSize = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (currentSize + Buffer.byteLength(clean) >= maxBytes) rotateLog(file);
    fs.appendFileSync(file, clean);
  } catch (error) {
    process.stderr.write(`log write failed: ${error?.message || error}\n`);
  }
}

function serviceMessage(message) {
  appendLog(serviceLog, `[${new Date().toISOString()}] ${message}\n`);
}

async function waitForInternet() {
  if (!baseUrl.startsWith('https://')) {
    serviceMessage('ALTURATH_BRIDGE_BASE_URL must be HTTPS.');
    process.exit(1);
  }

  const healthUrl = `${baseUrl}/api/whatsapp/health`;
  while (!stopping) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
      if (response.ok) return;
      serviceMessage(`waiting for server health: HTTP ${response.status}`);
    } catch (error) {
      serviceMessage(`waiting for internet/server: ${error?.message || error}`);
    }
    await sleep(15000);
  }
}

// A bridge crash can orphan its Chrome child; the leftover process (or its stale
// Singleton* files) then deadlocks every future boot with "The browser is already
// running". Sweep both before each start - anything holding the profile at this
// point is stale by definition, because the previous bridge has already exited.
function cleanStaleChromeLocks() {
  const profileDir = path.join(bridgeDir, '.session', 'session-alturath-mac-main');
  try {
    spawnSync('pkill', ['-9', '-f', profileDir], { stdio: 'ignore' });
  } catch {}
  for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.rmSync(path.join(profileDir, name), { force: true }); } catch {}
  }
}

async function runBridgeForever() {
  fs.mkdirSync(logsDir, { recursive: true });
  rotateLog(stdoutLog);
  rotateLog(stderrLog);
  rotateLog(serviceLog);

  while (!stopping) {
    await waitForInternet();
    if (stopping) break;

    serviceMessage('starting bridge process');
    cleanStaleChromeLocks();
    child = spawn(process.execPath, ['index.mjs'], {
      cwd: bridgeDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => appendLog(stdoutLog, chunk));
    child.stderr.on('data', (chunk) => appendLog(stderrLog, chunk));

    const exit = await new Promise((resolve) => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    child = null;

    serviceMessage(`bridge exited code=${exit.code ?? ''} signal=${exit.signal ?? ''}`);
    if (stopping || exit.code === 0) break;
    await sleep(5000);
  }
}

function shutdown(signal) {
  stopping = true;
  serviceMessage(`service runner stopping: ${signal}`);
  if (child && !child.killed) child.kill('SIGTERM');
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await runBridgeForever();
