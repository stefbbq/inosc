/** Remote part of a base ref (`origin/main` → `origin`), or null for a local ref. */
export const baseRemote = (base: string): string | null => (base.includes('/') ? (base.split('/')[0] ?? null) : null)
