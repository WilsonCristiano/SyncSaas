const RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "tv"]);

/** Aceita "@user", "user" ou link de perfil. Devolve o username normalizado ou null. */
export function parseUsername(input: string): string | null {
  let v = input.trim();
  if (/instagram\.com/i.test(v)) {
    try {
      v = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  v = v.replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(v) && !RESERVED.has(v) ? v : null;
}
