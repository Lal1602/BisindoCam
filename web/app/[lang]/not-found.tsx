import Link from "next/link";
import { getDictionary, getLocale } from "./dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const { notFound: t } = await getDictionary();

  return (
    <section className="page-gutter grid min-h-[70dvh] content-center gap-8 py-24 lg:grid-cols-12 lg:gap-x-10">
      <p className="font-display text-(length:--text-giant) leading-none text-clay italic lg:col-span-12">{t.eyebrow}</p>
      <h1 className="font-display text-(length:--text-title) lg:col-span-6">{t.title}</h1>
      <div className="grid content-end gap-6 lg:col-span-5 lg:col-start-8">
        <p className="text-(length:--text-lede) leading-snug text-ink-muted">{t.body}</p>
        <Link href={`/${locale}`} className="link-quiet w-fit">
          ← {t.back}
        </Link>
      </div>
    </section>
  );
}
