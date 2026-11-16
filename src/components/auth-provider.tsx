"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { authErrorMessage, safeAuthNext, type AuthSession, type AuthUser } from "@/lib/auth-policy";
import { existingReadingFirebaseAuth, getReadingFirebaseAuth } from "@/lib/firebase-client";
import { flushWorkspaceStores } from "@/lib/workspace-store";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  busy: boolean;
  enabled: boolean;
  error: string | null;
  signIn: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function codeFromError(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "AUTH_SIGN_IN_FAILED";
}

async function authMutation(path: string, data: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Reading-Auth": "1" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw { code: typeof result.error === "string" ? result.error : "AUTH_SIGN_IN_FAILED" };
  return result as { session?: AuthSession };
}

export function AuthProvider({ children, initialSession = null }: { children: ReactNode; initialSession?: AuthSession | null }) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const revision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error("unavailable");
      if (current !== revision.current) return;
      setSession(data.session ?? null);
      setEnabled(data.enabled === true);
    } catch {
      if (current !== revision.current) return;
      setSession(null);
      setEnabled(false);
    } finally { if (current === revision.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("reading-auth-state");
      channel.current.onmessage = () => { void refresh(); };
    }
    const onVisibility = () => { if (document.visibilityState === "visible" && !busyRef.current) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      revision.current++;
      channel.current?.close();
      channel.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => {
      setSession(null);
      if (window.location.pathname === "/app" || window.location.pathname.startsWith("/app/")) {
        window.location.assign(`/login?next=${encodeURIComponent(safeAuthNext(window.location.pathname + window.location.search))}&reason=expired`);
      }
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [session]);

  const signIn = useCallback(async (next = "/app") => {
    if (busyRef.current) return;
    if (session && session.expiresAt > Date.now()) {
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try { await flushWorkspaceStores(); window.location.assign(safeAuthNext(next)); }
      catch { setError(authErrorMessage("AUTH_WORKSPACE_SAVE_FAILED")); }
      finally { busyRef.current = false; setBusy(false); }
      return;
    }
    if (!enabled) { setError(authErrorMessage("AUTH_NOT_CONFIGURED")); return; }
    busyRef.current = true;
    revision.current++;
    setBusy(true);
    setError(null);
    try {
      const auth = getReadingFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      // Start the popup directly from the click, before any asynchronous fetch.
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      // Save before exchanging the account identity; a failed save keeps the current workspace mounted.
      await flushWorkspaceStores().catch(() => { throw { code: "AUTH_WORKSPACE_SAVE_FAILED" }; });
      const result = await authMutation("/api/auth/session", { idToken });
      if (!result.session) throw { code: "AUTH_SIGN_IN_FAILED" };
      // The HttpOnly cookie is the sole durable session. No Firebase token is persisted in browser storage.
      await firebaseSignOut(auth).catch(() => undefined);
      // Include edits queued while the session request was in flight.
      await flushWorkspaceStores().catch(() => { throw { code: "AUTH_WORKSPACE_SAVE_FAILED" }; });
      setSession(result.session);
      channel.current?.postMessage("signed-in");
      window.location.assign(safeAuthNext(next));
    } catch (caught) {
      setError(authErrorMessage(codeFromError(caught)));
      const auth = existingReadingFirebaseAuth();
      if (auth) await firebaseSignOut(auth).catch(() => undefined);
    } finally { busyRef.current = false; setBusy(false); }
  }, [enabled, session]);

  const signOut = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    revision.current++;
    setBusy(true);
    setError(null);
    try {
      try { await flushWorkspaceStores(); }
      catch {
        const discard = window.confirm("작업을 저장하지 못했어요. 취소를 누르면 현재 화면에서 작업을 백업할 수 있어요.\n\n저장되지 않은 변경 사항을 남겨 두고 지금 로그아웃할까요?\n\nYour latest changes could not be saved. Cancel to back them up, or choose OK to sign out without saving.");
        if (!discard) {
          setError("작업을 저장하지 못했어요. 현재 화면에서 백업한 뒤 다시 로그아웃해 주세요.");
          return;
        }
      }
      await authMutation("/api/auth/logout", {});
      setSession(null);
      const auth = existingReadingFirebaseAuth();
      if (auth) await firebaseSignOut(auth).catch(() => undefined);
      channel.current?.postMessage("signed-out");
      // A document navigation discards in-memory data from this account.
      window.location.assign("/");
    } catch {
      setError("로그아웃을 완료하지 못했어요. 연결을 확인하고 다시 눌러 주세요.");
    } finally { busyRef.current = false; setBusy(false); }
  }, []);

  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, busy, enabled, error, signIn, signOut, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
