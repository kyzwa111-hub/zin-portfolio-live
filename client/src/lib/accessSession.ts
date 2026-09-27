export type AccessSession = { requestId: string; token: string };
export type TerminalAccessStatus = "denied" | "expired" | "revoked" | "invalid";

const ACCESS_KEY = "zin-portfolio-access";

export function readAccessSession(): AccessSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ACCESS_KEY);
    return value ? (JSON.parse(value) as AccessSession) : null;
  } catch {
    return null;
  }
}

export function writeAccessSession(session: AccessSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("access-session-updated"));
}

export function clearAccessSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
  } catch {
    // The in-memory session can still be cleared if browser storage is unavailable.
  }
  window.dispatchEvent(new Event("access-session-updated"));
}

export function isTerminalAccessStatus(status: unknown): status is TerminalAccessStatus {
  return status === "denied" || status === "expired" || status === "revoked" || status === "invalid";
}
