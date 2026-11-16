export type WorkspaceMode = "demo" | "app";

export function workspaceMode(pathname: string): WorkspaceMode {
  return pathname === "/app" || pathname.startsWith("/app/") ? "app" : "demo";
}

/** Keep activity links inside their current workspace, including query strings. */
export function workspaceHref(href: string, mode: WorkspaceMode): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/(?:app|demo|login|api)(?:[/?#]|$)/.test(href)) return href;
  return `/${mode}${href === "/" ? "" : href}`;
}

/** Preserve earlier demo work. Account stores never fall back to demo records. */
export function scopedStorageKey(key: string, scope: string): string {
  return scope === "demo" ? key : `onbook:account:${encodeURIComponent(scope)}:${key}`;
}
