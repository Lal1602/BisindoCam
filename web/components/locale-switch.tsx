"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, rememberLocale, withLocale, type Locale } from "@/lib/i18n/config";

export function LocaleSwitch({
  current,
  labels,
}: {
  current: Locale;
  labels: { language: string; switchLanguage: string };
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.language} className="label flex items-center gap-1">
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="opacity-40">/</span>}
          {locale === current ? (
            <span aria-current="true" className="text-ink">
              {locale.toUpperCase()}
            </span>
          ) : (
            <Link
              href={withLocale(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              aria-label={labels.switchLanguage}
              onClick={() => rememberLocale(locale)}
              className="link-quiet transition-colors hover:text-ink"
            >
              {locale.toUpperCase()}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
