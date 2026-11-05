// Shared between server, client and proxy — keep free of server-only imports.

export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** Swap the locale segment of a pathname, e.g. /id/lab → /en/lab. */
export function withLocale(pathname: string, locale: Locale): string {
  const parts = pathname.split("/");
  if (parts.length > 1 && isLocale(parts[1])) parts[1] = locale;
  else parts.splice(1, 0, locale);
  return parts.join("/") || `/${locale}`;
}

/** Persist an explicit language choice so the proxy honours it on the next visit. */
export function rememberLocale(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
