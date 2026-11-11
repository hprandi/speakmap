/** Shows only the start and the end of a key, never the whole key. */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return "•".repeat(apiKey.length);
  return `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`;
}
