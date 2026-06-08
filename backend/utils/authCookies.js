/** httpOnly session cookie helpers (shared by auth routes + middleware). */

export function tokenFromCookies(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|;\s*)makebig_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `makebig_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      secure ? "; Secure" : ""
    }`
  );
}

export function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", "makebig_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
}
