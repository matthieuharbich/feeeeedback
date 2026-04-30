// Helpers for the firstname-only auth flow. The dashboard exposes a
// "Pseudo" field instead of an email; we hash the slugified pseudo into a
// synthetic email that Better Auth stores. Real emails (with an @ and a TLD)
// are still accepted for legacy users.

const SYNTHETIC_DOMAIN = "@local.feeeeedback";

export function isLikelyEmail(value: string) {
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(value);
}

export function slugifyUsername(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Convert a user-typed identifier into the email Better Auth will see.
 * - real email (`alice@example.com`) → returned as-is
 * - firstname `Tony` → `tony@local.feeeeedback`
 */
export function loginIdToEmail(input: string) {
  const trimmed = input.trim();
  if (isLikelyEmail(trimmed)) return trimmed.toLowerCase();
  const slug = slugifyUsername(trimmed);
  if (!slug) throw new Error("Pseudo invalide");
  return `${slug}${SYNTHETIC_DOMAIN}`;
}

export function emailToDisplay(email: string | null | undefined) {
  if (!email) return "";
  if (email.endsWith(SYNTHETIC_DOMAIN)) return "";
  return email;
}
