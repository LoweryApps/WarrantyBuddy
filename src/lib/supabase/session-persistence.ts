// @supabase/ssr (0.12.x) always writes its auth cookies with a fixed
// ~400-day Max-Age, ignoring any custom `cookieOptions.maxAge` passed to
// createBrowserClient — so "Remember me" can't be implemented by
// configuring the client. Instead, right after a successful sign-in with
// the checkbox unchecked, rewrite the cookie(s) it just wrote without a
// Max-Age/Expires attribute, turning them into session cookies the browser
// clears on close, while leaving the current session and its value intact
// until then.
export function forgetSessionOnBrowserClose() {
  if (typeof document === "undefined") return;

  for (const pair of document.cookie.split("; ")) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = pair.slice(0, separatorIndex);
    if (!/^sb-.*-auth-token/.test(name)) continue;
    const value = pair.slice(separatorIndex + 1);
    document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
  }
}
