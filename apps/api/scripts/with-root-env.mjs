/* global process, console */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(apiRoot, '../../.env') });

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-root-env.mjs <command> [args...]');
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: apiRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
