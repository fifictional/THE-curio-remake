#!/usr/bin/env node
/**
 * Start the two servers this repo actually needs, with health checks.
 *
 *   npm run dev:all              # API (:3101) + new UI (:5173)
 *   npm run dev:all -- --with-ui # also the legacy UI (:3300, needs ui:build)
 *
 * No dependency on concurrently/wait-on: spawn, prefix the output, wait for each
 * health endpoint, and forward Ctrl-C. If one process dies the others stop, so a
 * half-running stack cannot look healthy.
 */

import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const withUi = args.has('--with-ui');

const processes = [];
let shuttingDown = false;

function start(name, command, commandArgs, colour) {
  const child = spawn(command, commandArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const prefix = `\u001b[${colour}m[${name}]\u001b[0m`;
  const pipe = (stream, target) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) target.write(`${prefix} ${line}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`${prefix} exited (${signal ?? code}) — stopping the rest`);
    shutdown(code ?? 1);
  });

  processes.push({ name, child });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of processes) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

async function waitFor(url, label, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`  ${label} ready`);
        return true;
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`  ${label} did not become ready (${url})`);
  return false;
}

console.log('starting dev servers…');
start('api', 'npm', ['start'], '36');
start('web', 'npm', ['--prefix', 'web', 'run', 'dev'], '35');
if (withUi) start('ui', 'npm', ['--prefix', 'ui', 'run', 'start'], '33');

const apiPromise = waitFor('http://localhost:3101/__hello', 'api  http://localhost:3101');
const webPromise = waitFor('http://localhost:5173/', 'web  http://localhost:5173');
const uiPromise = withUi ? waitFor('http://localhost:3300/', 'ui   http://localhost:3300') : Promise.resolve(true);

const ready = await Promise.all([apiPromise, webPromise, uiPromise]);
if (!ready.every(Boolean)) shutdown(1);

if (!shuttingDown) {
  console.log('\nready — Ctrl-C to stop everything\n');
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
