// Set (or create) a password credential for an existing user.
// Usage (inside the running dashboard container):
//   node scripts/set-password.mjs <email> <password>

import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomBytes } from "crypto";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/set-password.mjs <email> <password>");
  process.exit(1);
}

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
function nid(size = 16) {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const userRes = await pool.query(`SELECT id FROM "user" WHERE lower(email) = lower($1) LIMIT 1`, [email]);
  if (!userRes.rows[0]) {
    console.error(`No user with email ${email}. Sign them in once via magic link first.`);
    process.exit(1);
  }
  const userId = userRes.rows[0].id;
  const hashed = await hashPassword(password);

  const existingAccount = await pool.query(
    `SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
    [userId]
  );

  if (existingAccount.rows[0]) {
    await pool.query(`UPDATE account SET password = $1, updated_at = now() WHERE id = $2`, [
      hashed,
      existingAccount.rows[0].id,
    ]);
    console.log(`✓ Password updated for ${email}`);
  } else {
    await pool.query(
      `INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, 'credential', $4, now(), now())`,
      [nid(), userId, userId, hashed]
    );
    console.log(`✓ Password created for ${email}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
