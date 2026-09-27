export type AccessSession = { requestId: string; token: string };

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
