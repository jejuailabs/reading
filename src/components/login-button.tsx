"use client";

import { useId, type ReactNode } from "react";
import { useAuth } from "./auth-provider";
import { useReading } from "./provider";

export function LoginButton({ children, next = "/app", className = "button primary" }: { children?: ReactNode; next?: string; className?: string }) {
  const { user, loading, busy, error, signIn } = useAuth();
  const { t } = useReading();
  const errorId = useId();
  return <span className="login-action">
    <button type="button" className={className} disabled={loading || busy} aria-busy={busy} aria-describedby={error ? errorId : undefined} onClick={() => void signIn(next)}>
      {!user ? <span className="google-login-mark" aria-hidden="true">G</span> : null}
      {busy ? t("로그인하는 중…", "Signing in…") : user ? t("내 작업 공간", "My workspace") : children ?? t("Google로 시작하기", "Continue with Google")}
    </button>
    {error ? <span className="login-error" id={errorId} role="alert">{error}</span> : null}
  </span>;
}
