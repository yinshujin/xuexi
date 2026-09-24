import { spawn } from 'node:child_process';

/** Run a command, streaming output; rejects on non-zero exit. */
export function run(cmd: string, args: string[], opts: { cwd?: string; env?: Record<string, string | undefined> } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} 退出码 ${code}`))));
  });
}
