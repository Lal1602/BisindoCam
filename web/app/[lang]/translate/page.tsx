import type { Metadata } from "next";
import { Translator } from "@/components/translate/translator";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { translate } = await getDictionary();
  return { title: translate.metaTitle, description: translate.intro };
}

export default async function TranslatePage() {
  const locale = await getLocale();
  const { translate, stage } = await getDictionary();

  return (
    <div className="page-gutter py-10 lg:py-14">
      <header className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-12 lg:gap-x-10">
        <p className="label lg:col-span-12">{translate.eyebrow}</p>
        <h1 className="font-display text-(length:--text-title) lg:col-span-6">{translate.title}</h1>
        <p className="max-w-[46ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">
          {translate.intro}
        </p>
      </header>

      <Translator labels={translate} stage={stage} english={locale === "en"} />

      <aside className="mt-20 grid gap-6 border-t hairline pt-10 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{translate.tipsLabel}</h2>
        <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:col-span-9">
          {translate.tips.map((tip, i) => (
            <li key={tip} className="flex gap-4">
              <span className="font-display text-2xl leading-none text-clay italic">{i + 1}</span>
              <span className="text-ink-muted">{tip}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
