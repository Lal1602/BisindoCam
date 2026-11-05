import type { Metadata } from "next";
import { datasets } from "@/content/datasets";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { bisindo } = await getDictionary();
  return { title: bisindo.metaTitle, description: bisindo.lede };
}

export default async function BisindoPage() {
  const locale = await getLocale();
  const { bisindo: t } = await getDictionary();

  return (
    <article className="page-gutter pb-24">
      <header className="grid gap-8 border-b hairline py-14 lg:grid-cols-12 lg:gap-x-10 lg:py-20">
        <p className="label lg:col-span-12">{t.eyebrow}</p>
        <h1 className="font-display text-(length:--text-title) text-balance lg:col-span-8">{t.title}</h1>
        <p className="max-w-[52ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-6 lg:col-start-7">{t.lede}</p>
      </header>

      {t.sections.map((s, i) => (
        <section key={s.label} className="grid gap-4 border-b hairline py-14 lg:grid-cols-12 lg:gap-x-10">
          <p className="label flex gap-3 lg:col-span-3">
            <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </p>
          <h2 className="font-display text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-tight lg:col-span-4">{s.title}</h2>
          <p className="max-w-[58ch] text-ink-muted lg:col-span-5">{s.body}</p>
        </section>
      ))}

      <section className="grid gap-8 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-3">
          <h2 className="label">{t.compareLabel}</h2>
          <p className="mt-4 text-ink-muted">{t.compareIntro}</p>
        </div>
        <div className="overflow-x-auto lg:col-span-9">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink">
                {t.compareHead.map((h, i) => (
                  <th key={i} scope="col" className={`py-3 pr-6 font-normal ${i ? "font-display text-2xl" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.compareRows.map(([head, a, b]) => (
                <tr key={head} className="border-b hairline align-top">
                  <th scope="row" className="label py-4 pr-6 font-normal">
                    {head}
                  </th>
                  <td className="py-4 pr-6">{a}</td>
                  <td className="py-4 pr-6 text-ink-muted">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{t.etiquetteLabel}</h2>
        <ol className="grid gap-6 lg:col-span-9">
          {t.etiquette.map((line, i) => (
            <li key={line} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-2">
              <span className="font-display text-3xl leading-none text-clay italic">{i + 1}</span>
              <span className="font-display text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-snug">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{t.learnLabel}</h2>
        <p className="max-w-[60ch] text-(length:--text-lede) leading-snug lg:col-span-8">{t.learnBody}</p>
      </section>

      <section id="attribution" className="grid gap-8 py-16 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-3">
          <h2 className="label">{t.attributionLabel}</h2>
          <p className="mt-4 text-ink-muted">{t.attributionIntro}</p>
        </div>
        <div className="lg:col-span-9">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink">
                  {t.attributionHead.map((h) => (
                    <th key={h} scope="col" className="label py-3 pr-6 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.name} className="border-b hairline align-top">
                    <td className="py-4 pr-6">
                      <a href={d.href} className="link-quiet" target="_blank" rel="noreferrer">
                        {d.name} ↗
                      </a>
                    </td>
                    <td className="py-4 pr-6 text-ink-muted">{d.contents[locale]}</td>
                    <td className="label py-4 pr-6 normal-case">{d.licence ?? t.licenceNotStated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-[64ch] text-[0.95rem] text-ink-muted">{t.attributionNote}</p>
        </div>
      </section>
    </article>
  );
}
