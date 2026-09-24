// Cloudflare's documented test secrets. Each accepts tokens without a real challenge.
const TEST_SECRETS = new Set(['1x', '2x', '3x'].map((prefix) => `${prefix}0000000000000000000000000000000AA`));

export const isTestSecret = (secret: string): boolean => TEST_SECRETS.has(secret);
