import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroStage } from "@/components/hero/hero-stage";
import { getDictionary, getLocale } from "./dictionaries";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function HomePage() {
  const locale = await getLocale();
  const { home, stage } = await getDictionary();
  const [first, middle, last] = home.titleLines;

  return (
    <>
      <section className="page-gutter grid gap-y-12 pt-8 pb-12 lg:h-[calc(100dvh-4rem)] lg:grid-cols-12 lg:gap-x-10 lg:min-h-[40rem] lg:grid-rows-[minmax(0,1fr)] lg:pb-8">
        <div className="flex flex-col justify-between gap-10 lg:col-span-6">
          <p className="label rise flex justify-between" style={stagger(0)}>
            <span>{home.eyebrow}</span>
            <span aria-hidden>(01)</span>
          </p>

          <h1 className="font-display text-[clamp(3.5rem,min(9vw,13vh),11rem)]">
            <span className="rise block" style={stagger(1)}>
              {first}
            </span>
            <span className="rise block pl-[0.9em] text-clay italic" style={stagger(2)}>
              {middle}
            </span>
            <span className="rise block" style={stagger(3)}>
              {last}
            </span>
          </h1>

          <div className="rise grid gap-6" style={stagger(4)}>
            <p className="max-w-[40ch] text-(length:--text-lede) leading-snug text-balance">{home.lede}</p>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href={`/${locale}/translate`}
                className="rounded-full bg-ink px-7 py-3.5 text-paper transition-colors duration-500 hover:bg-moss"
              >
                {home.ctaCamera}
              </Link>
              <Link href={`/${locale}/dictionary`} className="link-quiet py-1">
                {home.ctaDemo} →
              </Link>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t hairline pt-5">
              {home.stats.map((stat) => (
                <div key={stat.label} className="grid gap-1">
                  <dt className="label order-2">{stat.label}</dt>
                  <dd className="font-display order-1 text-[clamp(1.75rem,1.2rem+1.5vw,2.75rem)] leading-none">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="rise h-[min(82vh,40rem)] lg:col-span-6 lg:h-full" style={stagger(3)}>
          <HeroStage labels={stage} />
        </div>
      </section>

      <section className="page-gutter grid grid-cols-12 gap-x-4 gap-y-6 border-t hairline py-24 md:py-36">
        <h2 className="label col-span-12 md:col-span-3">{home.manifestoLabel}</h2>
        <p className="font-display col-span-12 text-[clamp(1.75rem,1.2rem+2.4vw,3.5rem)] leading-[1.12] text-pretty md:col-span-8">
          {home.manifesto}
        </p>
      </section>

      <section className="page-gutter border-t hairline py-24 md:py-32">
        <h2 className="label mb-10">{home.chaptersLabel}</h2>
        <ol className="border-t hairline">
          {home.chapters.map((chapter, i) => (
            <li key={chapter.key} className="border-b hairline">
              <Link
                href={`/${locale}/${chapter.key}`}
                className="group grid grid-cols-12 items-baseline gap-x-4 gap-y-2 py-8 md:py-10"
              >
                <span className="label col-span-2 tabular-nums md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display col-span-10 text-[clamp(2.25rem,1.5rem+3.5vw,5.5rem)] transition-colors duration-700 group-hover:text-clay group-hover:italic md:col-span-6">
                  {chapter.title}
                </span>
                <span className="col-span-10 col-start-3 text-ink-muted md:col-span-4 md:col-start-8">
                  {chapter.body}
                </span>
                <span
                  aria-hidden
                  className="hidden -translate-x-3 justify-self-end opacity-0 transition-all duration-700 group-hover:translate-x-0 group-hover:opacity-100 md:col-span-1 md:block"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="label mt-16 text-center">{home.privacy}</p>
      </section>
    </>
  );
}
