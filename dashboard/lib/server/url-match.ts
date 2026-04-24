// Match a URL against a glob-like pattern.
// Supports: `*` (any char except /), `**` (any chars incl. /), and literal strings.
// Patterns without a scheme are matched against host + path only.

export function urlMatches(pattern: string, url: string): boolean {
  try {
    const u = new URL(url);
    const haystack = pattern.includes("://")
      ? `${u.protocol}//${u.host}${u.pathname}`
      : `${u.host}${u.pathname}`;
    const rx = globToRegex(pattern);
    return rx.test(haystack);
  } catch {
    return false;
  }
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const rx = escaped
    .replace(/\*\*/g, "::DOUBLESTAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLESTAR::/g, ".*");
  return new RegExp(`^${rx}$`);
}

export function matchAnyPattern(patterns: string[] | null | undefined, url: string): boolean {
  if (!patterns || !patterns.length) return false;
  return patterns.some((p) => urlMatches(p, url));
}
