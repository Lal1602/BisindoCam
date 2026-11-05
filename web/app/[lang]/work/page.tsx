import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/content/projects";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { work } = await getDictionary();
  return { title: work.metaTitle, description: work.intro };
}

export default async function WorkPage() {
  const locale = await getLocale();
  const { work: t } = await getDictionary();

  return (
    <div className="page-gutter pb-24">
      <header className="grid gap-8 py-14 lg:grid-cols-12 lg:gap-x-10 lg:py-20">
        <p className="label lg:col-span-12">{t.eyebrow}</p>
        <h1 className="font-display text-(length:--text-giant) leading-[0.85] lg:col-span-8">{t.title}</h1>
        <p className="max-w-[40ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-4 lg:self-end">{t.intro}</p>
      </header>

      <ol className="border-t border-ink">
        {projects.map((p, i) => {
          const href = p.href?.startsWith("/") ? `/${locale}${p.href}` : p.href;
          const body = (
            <div className="grid gap-4 py-10 lg:grid-cols-12 lg:gap-x-10">
              <span className="label tabular-nums lg:col-span-1">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-[clamp(3rem,2rem+5vw,7rem)] leading-[0.9] transition-colors duration-700 group-hover:text-clay group-hover:italic lg:col-span-5">
                {p.title}
              </h2>
              <div className="grid content-start gap-4 lg:col-span-5 lg:col-start-8">
                <p className="text-(length:--text-lede) leading-snug">{p.summary[locale]}</p>
                <p className="text-ink-muted">{p.role[locale]}</p>
                <ul className="flex flex-wrap gap-2">
                  {p.tags.map((tag) => (
                    <li key={tag} className="label rounded-full border hairline px-3 py-1 normal-case">
                      {tag}
                    </li>
                  ))}
                </ul>
                <span className="label">{p.year}</span>
              </div>
            </div>
          );
          return (
            <li key={p.slug} className="border-b hairline">
              {href ? (
                <Link href={href} className="group block" aria-label={`${t.view}: ${p.title}`}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
      <p className="label mt-10">{t.more}</p>
    </div>
  );
}
