import { spawnSync } from 'node:child_process';
import path from 'node:path';

function bin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(process.cwd(), 'node_modules', '.bin', `${name}${ext}`);
}

function electronBuilderInvocation() {
  // On Windows, spawning a `.cmd` shim directly without a shell can throw EINVAL.
  // Instead, invoke the JS entrypoint with Node.
  if (process.platform === 'win32') {
    return {
      command: process.execPath,
      prefixArgs: [path.join(process.cwd(), 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js')],
    };
  }

  return { command: bin('electron-builder'), prefixArgs: [] };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`[desktop] Failed to run: ${command}`);
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const mode = process.argv[2];
if (!mode || !['package', 'dist'].includes(mode)) {
  console.error('Usage: node scripts/electron-build.mjs <package|dist>');
  process.exit(2);
}

// Unique output each run to avoid Windows file locks on previous output.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = `desktop/dist/${mode}-${stamp}`;
console.log(`[desktop] electron-builder output: ${outputDir}`);

const { command: electronBuilder, prefixArgs } = electronBuilderInvocation();
const baseArgs = [...prefixArgs, '--config', 'electron-builder.json', `-c.directories.output=${outputDir}`];

if (mode === 'package') {
  run(electronBuilder, ['--dir', ...baseArgs]);
} else {
  run(electronBuilder, baseArgs);
}
