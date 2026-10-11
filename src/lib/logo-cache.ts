// Module-scoped in-memory cache for organization logos
const logoUrlCache = new Map<string, { logoUrl: string | null; expires: number }>();

export function getCachedLogo(orgId: string): { logoUrl: string | null; expires: number } | undefined {
  return logoUrlCache.get(orgId);
}

export function setCachedLogo(orgId: string, data: { logoUrl: string | null; expires: number }): void {
  logoUrlCache.set(orgId, data);
}

export function invalidateLogoCache(orgId?: string): void {
  if (orgId) {
    logoUrlCache.delete(orgId);
  } else {
    logoUrlCache.clear();
  }
}
