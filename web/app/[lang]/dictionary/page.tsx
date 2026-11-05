import type { Metadata } from "next";
import { SignDictionary } from "@/components/dictionary/sign-dictionary";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getDictionary();
  return { title: dictionary.metaTitle, description: dictionary.intro };
}

export default async function DictionaryPage() {
  const locale = await getLocale();
  const { dictionary } = await getDictionary();

  return (
    <div className="page-gutter py-10 lg:py-14">
      <header className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-12 lg:gap-x-10">
        <p className="label lg:col-span-12">{dictionary.eyebrow}</p>
        <h1 className="font-display text-(length:--text-title) lg:col-span-6">{dictionary.title}</h1>
        <p className="max-w-[46ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">
          {dictionary.intro}
        </p>
      </header>
      <SignDictionary labels={dictionary} locale={locale} />
    </div>
  );
}
