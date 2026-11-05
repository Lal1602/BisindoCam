import type { Metadata } from "next";
import { profile } from "@/content/profile";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { about } = await getDictionary();
  return { title: about.metaTitle, description: profile.bio[locale] };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const { about: t } = await getDictionary();
  const hasContact = Boolean(profile.email || profile.links.length);

  return (
    <article className="page-gutter pb-24">
      <header className="grid gap-8 py-14 lg:grid-cols-12 lg:gap-x-10 lg:py-20">
        <p className="label lg:col-span-12">{t.eyebrow}</p>
        <h1 className="font-display text-(length:--text-giant) leading-[0.85] italic lg:col-span-7">{profile.name}</h1>
        <dl className="grid content-end gap-2 lg:col-span-4 lg:col-start-9">
          <dt className="label">{t.roleLabel}</dt>
          <dd className="font-display text-2xl">{profile.role[locale]}</dd>
          <dd className="text-ink-muted">{profile.location}</dd>
        </dl>
      </header>

      <section className="grid gap-6 border-t hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{t.bioLabel}</h2>
        <p className="font-display max-w-[32ch] text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-[1.15] lg:col-span-8">{profile.bio[locale]}</p>
      </section>

      <section id="contact" className="grid gap-8 border-t hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{t.contactLabel}</h2>
        <div className="grid gap-8 lg:col-span-8">
          <p className="max-w-[48ch] text-(length:--text-lede) leading-snug">{t.contactIntro}</p>
          {hasContact ? (
            <dl className="grid gap-6 sm:grid-cols-2">
              {profile.email && (
                <div>
                  <dt className="label mb-2">{t.emailLabel}</dt>
                  <dd>
                    <a href={`mailto:${profile.email}`} className="font-display link-quiet text-3xl">
                      {profile.email}
                    </a>
                  </dd>
                </div>
              )}
              {profile.links.length > 0 && (
                <div>
                  <dt className="label mb-2">{t.linksLabel}</dt>
                  <dd>
                    <ul className="grid gap-1">
                      {profile.links.map((l) => (
                        <li key={l.href}>
                          <a href={l.href} className="link-quiet" target="_blank" rel="noreferrer">
                            {l.label} ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-ink-muted">{t.contactPending}</p>
          )}
          <div className="border-t hairline pt-8">
            <h3 className="label mb-3">{t.feedbackLabel}</h3>
            <p className="max-w-[56ch] text-ink-muted">{t.feedback}</p>
          </div>
        </div>
      </section>
    </article>
  );
}
