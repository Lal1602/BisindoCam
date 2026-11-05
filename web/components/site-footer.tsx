import Link from "next/link";
import { profile } from "@/content/profile";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="page-gutter mt-auto border-t hairline pt-16 pb-10">
      <div className="grid gap-10 md:grid-cols-12">
        <p className="font-display text-[clamp(2.5rem,6vw,5rem)] italic md:col-span-7">
          {profile.name}
        </p>
        <div className="space-y-4 text-ink-muted md:col-span-4 md:col-start-9">
          <p>
            <Link href={`/${locale}/bisindo#attribution`} className="link-quiet">
              {dict.footer.attribution}
            </Link>
          </p>
          <p>
            <Link href={`/${locale}/about#contact`} className="link-quiet text-ink">
              {dict.nav.contact} →
            </Link>
          </p>
        </div>
      </div>
      <div className="label mt-16 flex flex-wrap items-center justify-between gap-4">
        <span>
          © 2026 · {dict.footer.made}
        </span>
        <a href="#main" className="link-quiet hover:text-ink">
          {dict.footer.top} ↑
        </a>
      </div>
    </footer>
  );
}
