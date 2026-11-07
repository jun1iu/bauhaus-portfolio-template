// Starts the server: npm run server
import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { ensureAdmin } from './auth.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDb(config.dbFile);
const admin = await ensureAdmin(db, config);
const app = createApp({ db, config });

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, ({ address, port }) => {
  const base = `http://${address === '::' || address === '0.0.0.0' ? 'localhost' : address}:${port}`;
  console.log(`\nServer running at ${base}`);
  console.log(`Admin:  ${base}/admin/`);
  if (admin.created && admin.generated) {
    console.log('\nFirst run: your admin password is\n\n    ' + admin.password + '\n\nSave it now. It is shown only once; you can change it in the admin under Account.');
  } else if (admin.created) {
    console.log('\nAdmin password set from ADMIN_PASSWORD. You can change it in the admin under Account.');
  }
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { server.close(() => { db.close(); process.exit(0); }); });
}
