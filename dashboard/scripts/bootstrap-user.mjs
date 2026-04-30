// Bootstrap a dashboard user with firstname-only login.
// Creates the user with a synthetic email `${slug}@local.feeeeedback`,
// sets the password, and (optionally) attaches them to an org as a
// non-owner member with project_member rows for ALL projects in that org
// (or only the ones whose slugs are passed as the 4th+ args).
//
// Usage:
//   node scripts/bootstrap-user.mjs <username> <password> [orgSlug] [projectSlug...]
//
// Examples:
//   node scripts/bootstrap-user.mjs Tony serena
//   node scripts/bootstrap-user.mjs Tony serena serena                 # all projects in 'serena'
//   node scripts/bootstrap-user.mjs Tony serena serena landing api     # only projects 'landing' and 'api' in 'serena'

import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomBytes } from "crypto";

const [, , rawUsername, rawPassword, rawOrgSlug, ...projectSlugs] = process.argv;
if (!rawUsername || !rawPassword) {
  console.error(
    "Usage: node scripts/bootstrap-user.mjs <username> <password> [orgSlug] [projectSlug...]"
  );
  process.exit(1);
}

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
function nid(size = 16) {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function slugify(s) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || nid(8)
  );
}

const username = rawUsername.trim();
const slug = slugify(username);
const email = `${slug}@local.feeeeedback`;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function ensureUser(name) {
  const existing = await pool.query(
    `SELECT id FROM "user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const id = nid();
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())`,
    [id, name, email]
  );
  console.log(`✓ User created: ${name} (${email}) → ${id}`);
  return id;
}

async function ensureCredential(userId, password) {
  const hashed = await hashPassword(password);
  const existing = await pool.query(
    `SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE account SET password = $1, updated_at = now() WHERE id = $2`,
      [hashed, existing.rows[0].id]
    );
    console.log(`✓ Password updated`);
  } else {
    await pool.query(
      `INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, 'credential', $4, now(), now())`,
      [nid(), userId, userId, hashed]
    );
    console.log(`✓ Password set (new credential account)`);
  }
}

async function ensureOrgMembership(userId, orgSlug) {
  const orgRow = await pool.query(`SELECT id, name FROM organization WHERE slug = $1 LIMIT 1`, [orgSlug]);
  const org = orgRow.rows[0];
  if (!org) {
    console.error(`! Organization "${orgSlug}" not found — skipping org attach`);
    return null;
  }
  const existing = await pool.query(
    `SELECT id FROM member WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
    [userId, org.id]
  );
  if (existing.rows[0]) {
    console.log(`✓ Already member of "${org.name}"`);
  } else {
    await pool.query(
      `INSERT INTO member (id, organization_id, user_id, role, created_at)
       VALUES ($1, $2, $3, 'member', now())`,
      [nid(), org.id, userId]
    );
    console.log(`✓ Added as member of "${org.name}"`);
  }
  return org.id;
}

async function ensureProjectAccess(userId, orgId, slugs) {
  let rows;
  if (slugs.length === 0) {
    rows = await pool.query(
      `SELECT id, name, slug FROM project WHERE organization_id = $1`,
      [orgId]
    );
  } else {
    rows = await pool.query(
      `SELECT id, name, slug FROM project WHERE organization_id = $1 AND slug = ANY($2::text[])`,
      [orgId, slugs]
    );
  }
  const projects = rows.rows;
  if (!projects.length) {
    console.warn(`! No matching projects in this org`);
    return;
  }
  for (const p of projects) {
    const existing = await pool.query(
      `SELECT id FROM project_member WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
      [p.id, userId]
    );
    if (existing.rows[0]) continue;
    await pool.query(
      `INSERT INTO project_member (id, project_id, user_id, created_at) VALUES ($1, $2, $3, now())`,
      [nid(), p.id, userId]
    );
    console.log(`  + project access: ${p.name} (${p.slug})`);
  }
}

async function main() {
  const userId = await ensureUser(username);
  await ensureCredential(userId, rawPassword);
  if (rawOrgSlug) {
    const orgId = await ensureOrgMembership(userId, rawOrgSlug);
    if (orgId) await ensureProjectAccess(userId, orgId, projectSlugs);
  }
  console.log("");
  console.log(`Login → username: ${username}  /  password: ${rawPassword}`);
  console.log(`(internal email: ${email})`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
