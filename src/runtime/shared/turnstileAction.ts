const MAX_LENGTH = 32;
const HASH_LENGTH = 8;

// FNV-1a, because the client and the server must agree synchronously and Web Crypto's digest is async.
const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(HASH_LENGTH, '0');
};

/** Turnstile accepts at most 32 characters from `[A-Za-z0-9_-]` as an action. */
export const turnstileAction = (id: string): string => {
  const safe = id.replace(/[^A-Za-z0-9_-]/g, '_');
  if (safe.length <= MAX_LENGTH) return safe;
  return `${safe.slice(0, MAX_LENGTH - HASH_LENGTH - 1)}-${fnv1a(id)}`;
};
