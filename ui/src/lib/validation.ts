export function isValidStackId(id: string): boolean {
  if (!id) return false;
  // Allow alphanumeric, underscore, hyphen
  // Prevents path traversal (no dots, slashes)
  return /^[a-zA-Z0-9_-]+$/.test(id);
}
