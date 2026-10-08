import { execFileSync } from 'node:child_process';

const output = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (output.trim()) {
  process.stderr.write('Release-candidate verification requires a clean, immutable Git worktree.\n');
  process.stderr.write(output);
  process.exit(1);
}

process.stdout.write('PASS: release candidate worktree is clean.\n');
