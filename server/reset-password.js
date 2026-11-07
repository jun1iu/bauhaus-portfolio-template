// Forgot the admin password? Run: npm run admin:reset
// Sets a new one (given as an argument, or invented and printed) and signs out every browser.
import { randomBytes } from 'node:crypto';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { setAdminPassword, endAllSessions, MIN_PASSWORD } from './auth.js';

const config = loadConfig();
const db = openDb(config.dbFile);
const given = process.argv[2];
if (given && given.length < MIN_PASSWORD) {
  console.error(`Use at least ${MIN_PASSWORD} characters.`);
  process.exit(1);
}
const password = given || randomBytes(12).toString('base64url');
await setAdminPassword(db, password);
endAllSessions(db);
db.close();
console.log(given ? 'Admin password changed.' : `Admin password changed. The new password is:\n\n    ${password}\n`);
