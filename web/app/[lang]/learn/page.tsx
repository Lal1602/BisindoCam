import type { Metadata } from "next";
import { Practice } from "@/components/learn/practice";
import { getDictionary } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { learn } = await getDictionary();
  return { title: learn.metaTitle, description: learn.intro };
}

export default async function LearnPage() {
  const { learn, stage } = await getDictionary();

  return (
    <div className="page-gutter py-10 lg:py-14">
      <header className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-12 lg:gap-x-10">
        <p className="label lg:col-span-12">{learn.eyebrow}</p>
        <h1 className="font-display text-(length:--text-title) lg:col-span-6">{learn.title}</h1>
        <p className="max-w-[46ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">
          {learn.intro}
        </p>
      </header>
      <Practice labels={learn} stage={stage} />
    </div>
  );
}
