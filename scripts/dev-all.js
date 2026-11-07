// Runs the site (Vite) and the server together for development: npm run dev:all
import { spawn } from 'node:child_process';

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: false });
const children = [run('npx', ['vite']), run('node', ['--watch', '--env-file-if-exists=.env', 'server/index.js'])];
const stop = () => children.forEach((c) => c.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((c) => c.on('exit', stop));
