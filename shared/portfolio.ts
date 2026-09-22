export type LinkedInSyncMode = "live" | "fallback";

export function getLinkedInSyncMode(hasApprovedCredentials: boolean): LinkedInSyncMode {
  return hasApprovedCredentials ? "live" : "fallback";
}

export function getLinkedInSyncLabel(mode: LinkedInSyncMode): string {
  return mode === "live" ? "Live LinkedIn sync" : "Update feed ready";
}
