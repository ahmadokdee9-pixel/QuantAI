/** True when href is a safe http(s) URL for an outbound product click. */
export function isValidHttpOfferUrl(href: string): boolean {
  const t = href.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
