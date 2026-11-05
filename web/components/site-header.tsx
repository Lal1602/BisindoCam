"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { navItems, type NavKey } from "@/lib/site";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  locale: Locale;
  nav: Record<NavKey | "home", string>;
  a11y: {
    primaryNav: string;
    openMenu: string;
    closeMenu: string;
    themeToLight: string;
    themeToDark: string;
    language: string;
    switchLanguage: string;
  };
};

export function SiteHeader({ locale, nav, a11y }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes the overlay; the page behind it stops scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const href = (slug: string) => `/${locale}/${slug}`;
  const isCurrent = (slug: string) => pathname === href(slug) || pathname.startsWith(`${href(slug)}/`);

  return (
    <header className="page-gutter sticky top-0 z-50 border-b hairline bg-paper/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-6">
        <Link href={`/${locale}`} className="group flex items-baseline gap-2" aria-label={nav.home}>
          <span className="font-display text-2xl italic leading-none">Isyarat</span>
          <span className="label hidden transition-colors group-hover:text-clay sm:inline">BISINDO</span>
        </Link>

        <nav aria-label={a11y.primaryNav} className="hidden xl:block">
          <ul className="flex items-center gap-7 text-[0.9rem]">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={href(item.slug)}
                  aria-current={isCurrent(item.slug) ? "page" : undefined}
                  className="link-quiet py-1 text-ink-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitch current={locale} labels={a11y} />
          <ThemeToggle labels={{ toLight: a11y.themeToLight, toDark: a11y.themeToDark }} />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border hairline xl:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? a11y.closeMenu : a11y.openMenu}</span>
            <span aria-hidden className="relative block h-2.5 w-4">
              <span
                className={`absolute left-0 h-px w-full bg-current transition-transform duration-500 ease-(--ease-quiet) ${open ? "top-1/2 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 h-px w-full bg-current transition-transform duration-500 ease-(--ease-quiet) ${open ? "top-1/2 -rotate-45" : "bottom-0"}`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="site-menu"
        hidden={!open}
        className="page-gutter fixed inset-x-0 top-16 bottom-0 overflow-y-auto bg-paper pb-12 xl:hidden"
      >
        <nav aria-label={a11y.primaryNav}>
          <ol className="mt-6 border-t hairline">
            {navItems.map((item, i) => (
              <li key={item.key} className="border-b hairline">
                <Link
                  href={href(item.slug)}
                  aria-current={isCurrent(item.slug) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-5 py-4"
                >
                  <span className="label w-6 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-[clamp(2rem,8vw,3.5rem)] transition-[font-variation-settings,color] duration-700 group-hover:text-clay group-aria-[current=page]:italic">
                    {nav[item.key]}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </header>
  );
}
