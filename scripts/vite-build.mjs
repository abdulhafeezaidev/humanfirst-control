import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function run(nodeArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, nodeArgs, {
      stdio: 'inherit',
      cwd: path.resolve(process.cwd()),
      env: process.env,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const args = process.argv.slice(2);
const viteBin = path.resolve('node_modules', 'vite', 'bin', 'vite.js');

if (args.length === 0) {
  console.error('Usage: node scripts/vite-build.mjs build [--mode desktop]');
  process.exitCode = 1;
} else {
  const code = await run([viteBin, ...args]);
  process.exitCode = code;
}
