// One-time script: creates your first admin (CFO) login.
// Usage: node src/db/seedAdmin.js "Your Name" you@company.com "a-strong-password"
require('dotenv').config();
const userService = require('../services/userService');

async function main() {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node src/db/seedAdmin.js "Your Name" you@company.com "a-strong-password"');
    process.exit(1);
  }
  const user = await userService.createUser({ name, email, password, role: 'admin', monthlyTarget: 0 });
  console.log('Admin account created:', user);
  process.exit(0);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
